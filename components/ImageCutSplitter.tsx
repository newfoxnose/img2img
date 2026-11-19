'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import JSZip from 'jszip'
import CameraUploadButton from '@/components/shared/CameraUploadButton'
import {
  ImageCutTool,
  type SnappedCut,
  type SnapHint,
} from '@/utils/imageCutSplitter'
import { type OutputFormat } from '@/utils/imageConverter'

// 支持的输入图片类型
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/jfif',
  'image/webp',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/tif',
]

const ACCEPTED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.jfif',
  '.webp',
  '.png',
  '.gif',
  '.bmp',
  '.tiff',
  '.tif',
]

interface CutLine extends SnappedCut {
  id: string
}

interface SliceResult {
  blob: Blob
  url: string
  name: string
  index: number
  width: number
  height: number
}

interface DragState {
  startX: number
  startY: number
  curX: number
  curY: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export default function ImageCutSplitter() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [tool, setTool] = useState<ImageCutTool | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lines, setLines] = useState<CutLine[]>([])
  const [drag, setDrag] = useState<DragState | null>(null)
  const [tolerance, setTolerance] = useState(16)
  const [searchRadius, setSearchRadius] = useState(30)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpg')
  const [results, setResults] = useState<SliceResult[]>([])
  const [isCutting, setIsCutting] = useState(false)
  const [error, setError] = useState('')
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef('')
  const resultUrlsRef = useRef<string[]>([])
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  // 清理旧的切割结果 URL
  const clearResults = useCallback(() => {
    resultUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    resultUrlsRef.current = []
    setResults([])
  }, [])

  // 选择文件后加载切割工具
  useEffect(() => {
    if (!file) {
      setTool(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError('')

    ImageCutTool.create(file)
      .then((instance) => {
        if (cancelled) return
        setTool(instance)
        setIsLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setTool(null)
        setIsLoading(false)
        setError(err instanceof Error ? err.message : '图片加载失败')
      })

    return () => {
      cancelled = true
    }
  }, [file])

  // 卸载时清理所有 URL
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      resultUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  // 文件选择
  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return
      const nextFile = selectedFiles[0]

      const lowerName = nextFile.name.toLowerCase()
      const isValidType =
        ACCEPTED_TYPES.includes(nextFile.type) ||
        ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))

      if (!isValidType) {
        alert(
          `文件 ${nextFile.name} 不是支持的格式。支持的格式：JPG、WebP、PNG、GIF、BMP、TIFF`
        )
        return
      }

      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      clearResults()

      const url = URL.createObjectURL(nextFile)
      previewUrlRef.current = url
      setPreviewUrl(url)
      setFile(nextFile)
      setTool(null)
      setLines([])
      setDrag(null)
      setError('')
    },
    [clearResults]
  )

  // 清空当前图片
  const handleClear = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = ''
    clearResults()
    setFile(null)
    setPreviewUrl('')
    setTool(null)
    setLines([])
    setDrag(null)
    setError('')
  }, [clearResults])

  // 换算鼠标位置为原图像素坐标
  const toImagePoint = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const width = tool?.imageWidth ?? 1
      const height = tool?.imageHeight ?? 1
      return {
        x: clamp(((e.clientX - rect.left) / rect.width) * width, 0, width),
        y: clamp(((e.clientY - rect.top) / rect.height) * height, 0, height),
      }
    },
    [tool]
  )

  // 添加吸附后的切割线
  const commitCut = useCallback(
    (hint: SnapHint) => {
      if (!tool) return
      const snapped = tool.snap(hint, { tolerance, searchRadius })
      if (!snapped) {
        setError('未能在划线附近识别到边线，请调整划线位置或增大吸附范围')
        return
      }

      setError('')
      setLines((prev) => {
        const rest = prev.filter(
          (line) =>
            !(
              line.orientation === snapped.orientation &&
              Math.abs(line.position - snapped.position) < 6
            )
        )
        return [
          ...rest,
          {
            ...snapped,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          },
        ]
      })
      clearResults()
    },
    [tool, tolerance, searchRadius, clearResults]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!tool || isLoading) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      const point = toImagePoint(e)
      dragStartRef.current = point
      setDrag({ startX: point.x, startY: point.y, curX: point.x, curY: point.y })
      setError('')
    },
    [tool, isLoading, toImagePoint]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!drag || !tool) return
      const point = toImagePoint(e)
      setDrag((prev) => (prev ? { ...prev, curX: point.x, curY: point.y } : prev))
    },
    [drag, tool, toImagePoint]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const start = dragStartRef.current
      dragStartRef.current = null
      setDrag(null)
      if (!start || !tool) return

      const end = toImagePoint(e)
      const dx = Math.abs(end.x - start.x)
      const dy = Math.abs(end.y - start.y)

      // 距离太短视为误点击
      if (Math.max(dx, dy) < 8) return

      if (dy >= dx) {
        commitCut({
          orientation: 'vertical',
          position: (start.x + end.x) / 2,
          spanStart: Math.min(start.y, end.y),
          spanEnd: Math.max(start.y, end.y),
        })
      } else {
        commitCut({
          orientation: 'horizontal',
          position: (start.y + end.y) / 2,
          spanStart: Math.min(start.x, end.x),
          spanEnd: Math.max(start.x, end.x),
        })
      }
    },
    [tool, toImagePoint, commitCut]
  )

  const handlePointerCancel = useCallback(() => {
    dragStartRef.current = null
    setDrag(null)
  }, [])

  // 删除切割线
  const handleRemoveLine = useCallback(
    (id: string) => {
      setLines((prev) => prev.filter((line) => line.id !== id))
      clearResults()
    },
    [clearResults]
  )

  // 执行切割
  const handleSplit = useCallback(async () => {
    if (!tool || lines.length === 0 || isCutting) return
    setIsCutting(true)
    setError('')
    try {
      const { blobs, cells } = await tool.split(lines, outputFormat)
      clearResults()
      const baseName = (file?.name || 'image').replace(/\.[^.]+$/, '')
      const nextResults: SliceResult[] = blobs.map((blob, index) => ({
        blob,
        url: URL.createObjectURL(blob),
        name: `${baseName}_${index + 1}.${outputFormat}`,
        index,
        width: cells[index].width,
        height: cells[index].height,
      }))
      resultUrlsRef.current = nextResults.map((item) => item.url)
      setResults(nextResults)
    } catch (err) {
      console.error('切割失败:', err)
      setError(err instanceof Error ? err.message : '切割失败，请重试')
    } finally {
      setIsCutting(false)
    }
  }, [tool, lines, isCutting, outputFormat, file, clearResults])

  const handleDownload = useCallback((slice: SliceResult) => {
    const link = document.createElement('a')
    link.href = slice.url
    link.download = slice.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  const handleBatchDownload = useCallback(async () => {
    if (results.length === 0) {
      alert('没有可下载的文件')
      return
    }
    try {
      const zip = new JSZip()
      results.forEach((item) => zip.file(item.name, item.blob))
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipUrl = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = zipUrl
      link.download = `cut_${Date.now()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(zipUrl)
    } catch (err) {
      console.error('打包失败:', err)
      alert('打包下载失败，请重试')
    }
  }, [results])

  // 文件拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingFile(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  // 统计切割线数量
  const countCuts = (orientation: 'vertical' | 'horizontal') => {
    const positions = lines
      .filter((line) => line.orientation === orientation)
      .map((line) => line.position)
      .sort((a, b) => a - b)
    let count = 0
    let last = -Infinity
    positions.forEach((pos) => {
      if (pos - last >= 4) {
        count++
        last = pos
      }
    })
    return count
  }

  const verticalCount = countCuts('vertical')
  const horizontalCount = countCuts('horizontal')
  const expectedCount = useMemo(() => {
    if (!tool || lines.length === 0) return 0
    return tool.countRegions(lines)
  }, [tool, lines])

  // 展示自动延长后的实际切割线（与执行切割时的范围一致）
  const displayLines = useMemo(() => {
    if (!tool || lines.length === 0) return lines
    return tool.resolveLines(lines).map((line, index) => ({
      ...line,
      id: lines[index].id,
    }))
  }, [tool, lines])

  return (
    <div className="max-w-5xl mx-auto">
      {/* 上传区域 */}
      {!file && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 md:p-12 text-center transition-colors ${
            isDraggingFile
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.jfif,.webp,.png,.gif,.bmp,.tiff,.tif,image/*"
            className="hidden"
            onChange={(e) => {
              handleFileSelect(e.target.files)
              e.target.value = ''
            }}
          />
          <div className="space-y-4">
            <div className="text-5xl mb-4">✂️</div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              拖拽拼接图片到此处或点击选择文件
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              上传后在图片上手动划线，工具会沿划线自动吸附真实边线（白边或两图交界），两端自动延长到最近的图片边缘或其他切割线，支持 T 型分割
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                选择文件
              </button>
              <CameraUploadButton onSelect={handleFileSelect} />
            </div>
          </div>
        </div>
      )}

      {file && (
        <div className="space-y-6">
          {/* 参数面板 */}
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {isLoading ? (
                  <span className="inline-flex items-center gap-2 text-blue-600">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></span>
                    正在加载图片...
                  </span>
                ) : error ? (
                  <span className="text-red-600">{error}</span>
                ) : (
                  <>
                    已划线：竖向 {verticalCount} 条、横向 {horizontalCount} 条
                    {lines.length > 0 && (
                      <>
                        ，预计生成{' '}
                        <strong className="text-gray-900 dark:text-white">
                          {expectedCount}
                        </strong>{' '}
                        张图片
                      </>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg transition-colors"
                >
                  更换图片
                </button>
                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                >
                  清空
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.jfif,.webp,.png,.gif,.bmp,.tiff,.tif,image/*"
              className="hidden"
              onChange={(e) => {
                handleFileSelect(e.target.files)
                e.target.value = ''
              }}
            />

            {/* 输出格式 */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                输出格式：
              </span>
              <div className="flex gap-2">
                {(['jpg', 'png', 'webp'] as OutputFormat[]).map((format) => (
                  <button
                    key={format}
                    onClick={() => {
                      setOutputFormat(format)
                      clearResults()
                    }}
                    className={`px-4 py-1.5 rounded-lg transition-colors font-medium uppercase text-sm ${
                      outputFormat === format
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            {/* 吸附参数 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    吸附范围
                  </label>
                  <span className="text-sm text-gray-500 tabular-nums">
                    {searchRadius}px
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={150}
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  在划线两侧该范围内查找真实边线
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    白边容差
                  </label>
                  <span className="text-sm text-gray-500 tabular-nums">{tolerance}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  判断白色/纯色分隔缝的颜色宽容度
                </p>
              </div>
            </div>
          </div>

          {/* 原图 + 划线区域 */}
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                在图片上按住拖动划线
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                竖着划 = 左右切割，横着划 = 上下切割
              </span>
            </div>

            <div className="relative inline-block max-w-full bg-gray-100 dark:bg-gray-900 rounded overflow-hidden select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="待切割的拼接图"
                className="block max-w-full h-auto select-none"
                style={{ maxHeight: '70vh' }}
                draggable={false}
              />
              {tool && (
                <svg
                  className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                  viewBox={`0 0 ${tool.imageWidth} ${tool.imageHeight}`}
                  preserveAspectRatio="none"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                >
                  {/* 已生成的切割线（两端自动延长到最近的边缘或其他切割线） */}
                  {displayLines.map((line) =>
                    line.orientation === 'vertical' ? (
                      <line
                        key={line.id}
                        x1={line.position}
                        y1={line.spanStart}
                        x2={line.position}
                        y2={line.spanEnd}
                        stroke="#2563eb"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                      />
                    ) : (
                      <line
                        key={line.id}
                        x1={line.spanStart}
                        y1={line.position}
                        x2={line.spanEnd}
                        y2={line.position}
                        stroke="#2563eb"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                      />
                    )
                  )}

                  {/* 拖动中的参考线 */}
                  {drag && (
                    <line
                      x1={drag.startX}
                      y1={drag.startY}
                      x2={drag.curX}
                      y2={drag.curY}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </svg>
              )}
            </div>

            {lines.length === 0 && !isLoading && (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                提示：在图片上拖出一条线即可，切割线两端会自动延长到最近的图片边缘或另一条切割线，无需精确画到边界。
              </p>
            )}

            {/* 切割线列表 */}
            {lines.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {displayLines.map((line) => {
                  const spanLimit =
                    line.orientation === 'vertical'
                      ? tool?.imageHeight ?? 0
                      : tool?.imageWidth ?? 0
                  const isFullSpan =
                    line.spanStart <= 1 && line.spanEnd >= spanLimit - 1
                  const spanLabel = isFullSpan
                    ? line.orientation === 'vertical'
                      ? '全高'
                      : '全宽'
                    : `${line.spanStart}–${line.spanEnd}px`

                  return (
                    <span
                      key={line.id}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-200 dark:border-blue-800"
                    >
                      {line.orientation === 'vertical' ? '竖向' : '横向'}{' '}
                      {line.orientation === 'vertical'
                        ? `x=${line.position}px`
                        : `y=${line.position}px`}{' '}
                      · {spanLabel} ·{' '}
                      {line.method === 'gutter' ? '白边吸附' : '图片边缘'}
                      <button
                        onClick={() => handleRemoveLine(line.id)}
                        aria-label="删除该切割线"
                        className="text-blue-400 hover:text-red-600 leading-none text-sm"
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
                <button
                  onClick={() => {
                    setLines([])
                    clearResults()
                  }}
                  className="px-3 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  清空划线
                </button>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={handleSplit}
                disabled={lines.length === 0 || isCutting || isLoading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCutting ? '正在切割...' : `执行切割${expectedCount > 0 ? `（${expectedCount} 张）` : ''}`}
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                白边切割取缝隙中心，直接相接的图片取相邻像素差异最大的边界
              </span>
            </div>
          </div>

          {/* 切割结果 */}
          {results.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  切割结果（{results.length} 张）
                </h3>
                <button
                  onClick={handleBatchDownload}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  打包下载全部
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {results.map((slice) => (
                  <div
                    key={slice.index}
                    className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
                  >
                    <div className="aspect-video flex items-center justify-center bg-gray-200 dark:bg-gray-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slice.url}
                        alt={slice.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-2 text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate mb-1">
                        第 {slice.index + 1} 张（{slice.width}×{slice.height}）
                      </p>
                      <button
                        onClick={() => handleDownload(slice)}
                        className="w-full px-2 py-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-xs rounded transition-colors"
                      >
                        下载
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
