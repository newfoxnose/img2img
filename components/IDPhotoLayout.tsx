'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PAPER_SIZES,
  mmToPx,
  pxToMm,
  type PaperSize,
  type LayoutItem,
} from '@/utils/photoLayout'

interface UploadedPhoto {
  id: string
  file: File
  url: string
  /** 原图自然像素宽 */
  naturalWidth: number
  /** 原图自然像素高 */
  naturalHeight: number
  /** 300dpi 下对应的物理宽度 mm */
  widthMm: number
  /** 300dpi 下对应的物理高度 mm */
  heightMm: number
  count: number
}

/** 画布上的单个照片渲染对象 */
interface PlacedPhoto extends LayoutItem {
  url: string
}

/** 在画布上用 px 定位 */
function itemToPx(item: LayoutItem) {
  return {
    px: mmToPx(item.x),
    py: mmToPx(item.y),
    pw: mmToPx(item.widthMm),
    ph: mmToPx(item.heightMm),
  }
}

async function loadNaturalSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 1, h: 1 })
    img.src = url
  })
}

export default function IDPhotoLayout() {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [gapMm, setGapMm] = useState(2)
  const [paperSize, setPaperSize] = useState<PaperSize>('5inch')
  const [placed, setPlaced] = useState<PlacedPhoto[]>([])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [dragInstanceId, setDragInstanceId] = useState<string | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const [hoverInstanceId, setHoverInstanceId] = useState<string | null>(null)

  const paper = PAPER_SIZES[paperSize]
  const paperWpx = mmToPx(paper.widthMm)
  const paperHpx = mmToPx(paper.heightMm)

  /** === 文件处理 === */
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const newPhotos: UploadedPhoto[] = []
    for (const f of arr) {
      const url = URL.createObjectURL(f)
      const { w, h } = await loadNaturalSize(url)
      newPhotos.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        url,
        naturalWidth: w,
        naturalHeight: h,
        widthMm: pxToMm(w),
        heightMm: pxToMm(h),
        count: 1,
      })
    }
    setPhotos((prev) => [...prev, ...newPhotos])
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((p) => p.id !== id)
    })
  }

  const updatePhotoCount = (id: string, count: number) => {
    const clamped = Math.max(1, Math.min(50, Math.round(count)))
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, count: clamped } : p))
    )
  }

  const clearAll = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url))
    setPhotos([])
    setPlaced([])
  }

  /**
   * 为新照片找下一个不与已有照片重叠的空位（左上优先扫描）
   * 步长 = gap，保证搜索效率与"留间隙"直觉一致
   */
  function findNextFreePosition(
    w: number,
    h: number,
    existing: LayoutItem[],
    paperW: number,
    paperH: number,
    gap: number
  ): { x: number; y: number } {
    // 没有已有照片 → 直接左上角
    if (existing.length === 0) return { x: 0, y: 0 }

    const step = Math.max(1, gap)
    const candidates: { x: number; y: number }[] = []
    // 候选点：(0,0)、所有已有照片的右边缘 + gap 与 下边缘 + gap
    for (const item of existing) {
      const rx = item.x + item.widthMm + gap
      const by = item.y + item.heightMm + gap
      if (rx + w <= paperW) candidates.push({ x: rx, y: item.y })
      if (by + h <= paperH) {
        candidates.push({ x: 0, y: by })
        for (const item2 of existing) {
          const x2 = item2.x + item2.widthMm + gap
          if (x2 + w <= paperW) candidates.push({ x: x2, y: by })
        }
      }
    }
    candidates.push({ x: 0, y: 0 })

    const overlaps = (x: number, y: number) =>
      existing.some(
        (it) =>
          x < it.x + it.widthMm &&
          x + w > it.x &&
          y < it.y + it.heightMm &&
          y + h > it.y
      )

    // 按 y 主、x 次排序，优先放上面、左边
    candidates.sort((a, b) =>
      Math.abs(a.y - b.y) > step / 2 ? a.y - b.y : a.x - b.x
    )

    for (const c of candidates) {
      if (
        c.x >= 0 &&
        c.y >= 0 &&
        c.x + w <= paperW &&
        c.y + h <= paperH &&
        !overlaps(c.x, c.y)
      ) {
        return { x: c.x, y: c.y }
      }
    }

    // 实在找不到（相纸已满）→ 回退到右下角（可能部分超出，由用户拖动）
    return { x: Math.max(0, paperW - w), y: Math.max(0, paperH - h) }
  }

  /**
   * 同步 placed 与 photos：数量变化时立即在相纸上增删对应实例
   * - 已有实例保留原位置（用户拖动过的位置不被破坏）
   * - 增加数量：新增实例放到下一个不重叠的空位
   * - 减少数量：删除该 photoId 末尾的若干实例
   * - 删除照片：移除该 photoId 全部实例
   */
  const syncPlaced = useCallback(() => {
    setPlaced((prev) => {
      const desired = new Map<string, { w: number; h: number; url: string }>()
      for (const p of photos) {
        for (let i = 0; i < p.count; i++) {
          desired.set(`${p.id}-${i}`, {
            w: p.widthMm,
            h: p.heightMm,
            url: p.url,
          })
        }
      }

      // 保留仍在 desired 中的已有项
      const kept = prev.filter((p) => desired.has(p.instanceId))
      const existingIds = new Set(kept.map((p) => p.instanceId))

      const toAdd: string[] = []
      for (const id of Array.from(desired.keys())) {
        if (!existingIds.has(id)) toAdd.push(id)
      }

      const paper = PAPER_SIZES[paperSize]
      let working = [...kept]
      for (const instanceId of toAdd) {
        const meta = desired.get(instanceId)!
        const [photoId] = instanceId.split('-')
        // 从 photoId 解析出尺寸（meta 里已有 w/h）
        const pos = findNextFreePosition(
          meta.w,
          meta.h,
          working,
          paper.widthMm,
          paper.heightMm,
          gapMm
        )
        working.push({
          photoId,
          instanceId,
          x: pos.x,
          y: pos.y,
          widthMm: meta.w,
          heightMm: meta.h,
          rotated: false,
          url: meta.url,
        })
      }

      return working
    })
  }, [photos, paperSize, gapMm])

  // 数量/尺寸/纸张/间隙变化时同步（保留已有位置）
  useEffect(() => {
    if (photos.length === 0) {
      setPlaced([])
      return
    }
    syncPlaced()
  }, [photos, paperSize, gapMm, syncPlaced])

  // 纸张缩放
  useEffect(() => {
    const updateScale = () => {
      const el = containerRef.current
      if (!el) return
      const maxW = el.clientWidth - 32
      const maxH = window.innerHeight - 280
      const s = Math.min(maxW / paperWpx, maxH / paperHpx, 1.5)
      setScale(Math.max(0.2, s))
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [paperWpx, paperHpx])

  /** === 画布渲染（实时） === */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = paperWpx
    canvas.height = paperHpx
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 纸张白底
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, paperWpx, paperHpx)

    // 纸张裁切线（虚线）
    ctx.strokeStyle = '#e5e7eb'
    ctx.setLineDash([8, 4])
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, paperWpx - 1, paperHpx - 1)
    ctx.setLineDash([])

    // 预加载所有图片，避免每帧 new Image() 抖动
    const imgCache = new Map<string, HTMLImageElement>()
    let pending = 0
    let doneRendered = false
    const tryRender = () => {
      if (doneRendered) return
      if (pending > 0) return
      doneRendered = true
      renderAll()
    }
    const renderAll = () => {
      // 先清底
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, paperWpx, paperHpx)
      ctx.strokeStyle = '#e5e7eb'
      ctx.setLineDash([8, 4])
      ctx.lineWidth = 1
      ctx.strokeRect(0.5, 0.5, paperWpx - 1, paperHpx - 1)
      ctx.setLineDash([])

      for (const item of placed) {
        const img = imgCache.get(item.url)
        if (!img) continue
        const { px, py, pw, ph } = itemToPx(item)
        drawPhoto(
          ctx,
          img,
          px,
          py,
          pw,
          ph,
          hoverInstanceId === item.instanceId
        )
      }
    }

    // 收集要加载的图片
    const uniqueUrls = Array.from(new Set(placed.map((p) => p.url)))
    if (uniqueUrls.length === 0) return

    for (const url of uniqueUrls) {
      const img = new window.Image()
      pending++
      img.onload = () => {
        imgCache.set(url, img)
        pending--
        tryRender()
      }
      img.onerror = () => {
        pending--
        tryRender()
      }
      img.src = url
    }
    tryRender()
  }, [placed, paperWpx, paperHpx, hoverInstanceId])

  function drawPhoto(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
    highlight: boolean
  ) {
    // 照片外框
    ctx.fillStyle = '#fff'
    ctx.fillRect(x, y, w, h)
    // 按原比例 contain 居中，不裁切
    const ratio = img.width / img.height
    const targetRatio = w / h
    let drawW = w
    let drawH = h
    if (ratio > targetRatio) {
      drawH = Math.round(w / ratio)
    } else {
      drawW = Math.round(h * ratio)
    }
    const drawX = x + Math.round((w - drawW) / 2)
    const drawY = y + Math.round((h - drawH) / 2)
    ctx.drawImage(img, drawX, drawY, drawW, drawH)

    // 高亮描边（悬停）
    if (highlight) {
      ctx.strokeStyle = '#2563eb'
      ctx.lineWidth = Math.max(2, Math.round(2 / scale))
      ctx.strokeRect(x, y, w, h)
    }
  }

  /** === 画布上照片拖动（按 instanceId 精确定位） === */
  const getCanvasPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    }
  }

  const findPhotoAt = (cx: number, cy: number): PlacedPhoto | null => {
    for (let i = placed.length - 1; i >= 0; i--) {
      const p = placed[i]
      const { px, py, pw, ph } = itemToPx(p)
      if (cx >= px && cx <= px + pw && cy >= py && cy <= py + ph) {
        return p
      }
    }
    return null
  }

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasPos(e.clientX, e.clientY)
    const hit = findPhotoAt(x, y)
    if (hit) {
      setDragInstanceId(hit.instanceId)
      const { px, py } = itemToPx(hit)
      dragOffsetRef.current = { x: x - px, y: y - py }
    }
  }

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCanvasPos(e.clientX, e.clientY)
    if (dragInstanceId) {
      setPlaced((prev) => {
        return prev.map((p) => {
          if (p.instanceId !== dragInstanceId) return p
          let newXmm = (x - dragOffsetRef.current.x) / mmToPx(1)
          let newYmm = (y - dragOffsetRef.current.y) / mmToPx(1)
          newXmm = Math.max(0, Math.min(paper.widthMm - p.widthMm, newXmm))
          newYmm = Math.max(0, Math.min(paper.heightMm - p.heightMm, newYmm))
          return { ...p, x: newXmm, y: newYmm }
        })
      })
    } else {
      const hit = findPhotoAt(x, y)
      const newHover = hit?.instanceId ?? null
      if (newHover !== hoverInstanceId) setHoverInstanceId(newHover)
    }
  }

  const onCanvasMouseUp = () => {
    setDragInstanceId(null)
  }

  /** === 导出 === */
  const handleDownload = () => {
    if (placed.length === 0) return
    const canvas = canvasRef.current!
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `证件照排版_${paper.widthMm}x${paper.heightMm}mm_300dpi.jpg`
    a.click()
  }

  const handleDownloadPNG = () => {
    if (placed.length === 0) return
    const canvas = canvasRef.current!
    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `证件照排版_${paper.widthMm}x${paper.heightMm}mm_300dpi.png`
    a.click()
  }

  const totalCount = placed.length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
      {/* 左侧：控件区 */}
      <div className="space-y-4">
        {/* 拖放上传区 */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 transition-colors bg-gray-50 dark:bg-gray-800/50"
        >
          <div className="text-3xl mb-2">🖼️</div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            拖放照片到这里，或点击选择
          </p>
          <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition-colors text-sm">
            选择图片
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
        </div>

        {/* 参数面板 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow space-y-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
            纸张与间隙
          </h3>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
              相纸规格
            </label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as PaperSize)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            >
              {Object.entries(PAPER_SIZES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.name} ({v.widthMm}×{v.heightMm}mm)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
              照片间隙：{gapMm}mm
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={gapMm}
              onChange={(e) => setGapMm(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* 照片列表 */}
        {photos.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                照片列表 ({photos.length})
              </span>
              <button
                onClick={clearAll}
                className="text-xs text-red-500 hover:text-red-600"
              >
                全部清除
              </button>
            </div>
            <ul className="max-h-64 overflow-auto divide-y divide-gray-100 dark:divide-gray-700">
              {photos.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 text-xs"
                >
                  <img
                    src={p.url}
                    alt=""
                    className="w-10 h-14 object-cover rounded border border-gray-200 dark:border-gray-700 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-gray-800 dark:text-gray-200">
                      {p.file.name}
                    </div>
                    <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                      {p.naturalWidth}×{p.naturalHeight}px @ 300dpi →{' '}
                      {p.widthMm.toFixed(1)}×{p.heightMm.toFixed(1)}mm
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => updatePhotoCount(p.id, p.count - 1)}
                      className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm leading-none"
                      title="减少"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={p.count}
                      onChange={(e) =>
                        updatePhotoCount(p.id, parseInt(e.target.value) || 1)
                      }
                      className="w-10 h-6 px-1 text-center text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded"
                    />
                    <button
                      onClick={() => updatePhotoCount(p.id, p.count + 1)}
                      className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm leading-none"
                      title="增加"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removePhoto(p.id)}
                    className="text-gray-400 hover:text-red-500"
                    title="移除"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownload}
              disabled={placed.length === 0}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors"
            >
              下载 JPG
            </button>
            <button
              onClick={handleDownloadPNG}
              disabled={placed.length === 0}
              className="px-3 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors"
            >
              下载 PNG
            </button>
          </div>
          {totalCount > 0 && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">
              共 {totalCount} 张照片 · {paper.widthMm}×{paper.heightMm}mm · 300dpi
            </p>
          )}
        </div>
      </div>

      {/* 右侧：画布区 */}
      <div
        ref={containerRef}
        className="flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-auto"
        style={{ minHeight: 480 }}
      >
        {photos.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="text-5xl mb-3">📐</div>
            <p className="text-sm">
              拖放照片到左侧，系统会按原图尺寸（300dpi）放到 5寸 相纸（102×152mm）上
            </p>
            <p className="text-xs mt-3 text-gray-400">
              调整照片数量会立即增删，可在相纸上直接拖动任意位置
            </p>
          </div>
        ) : (
          <div
            style={{ width: paperWpx * scale, height: paperHpx * scale }}
            className="shadow-2xl relative select-none"
          >
            <canvas
              ref={canvasRef}
              width={paperWpx}
              height={paperHpx}
              style={{
                width: paperWpx * scale,
                height: paperHpx * scale,
                cursor: dragInstanceId
                  ? 'grabbing'
                  : placed.length > 0
                  ? 'grab'
                  : 'default',
              }}
              className="bg-white rounded-sm"
              onMouseDown={onCanvasMouseDown}
              onMouseMove={onCanvasMouseMove}
              onMouseUp={onCanvasMouseUp}
              onMouseLeave={onCanvasMouseUp}
            />
          </div>
        )}
      </div>
    </div>
  )
}
