'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { rotateImage, getRotatedDimensions, type CropRect } from '@/utils/imageSplitter'

interface CropEditorProps {
  file: File
  rotation: number
  cropRect: CropRect
  onRotationChange: (rotation: number) => void
  onCropChange: (cropRect: CropRect) => void
}

// 最小裁切尺寸（画布像素）
const MIN_CROP_SIZE = 10

type DragEdge = 'top' | 'bottom' | 'left' | 'right' | null

interface DragState {
  edge: DragEdge
  startX: number
  startY: number
  startRect: CropRect
}

export default function CropEditor({
  file,
  rotation,
  cropRect,
  onRotationChange,
  onCropChange,
}: CropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<DragState | null>(null)

  // 旋转后画布的实际像素尺寸
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  // 加载图片并获取原始尺寸，用于计算旋转后尺寸
  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      imgRef.current = img
      const { width, height } = getRotatedDimensions(img.width, img.height, rotation)
      setCanvasSize({ w: width, h: height })
    }
    img.src = URL.createObjectURL(file)
    return () => {
      cancelled = true
    }
  }, [file, rotation])

  // 将图片旋转后绘制到 canvas
  useEffect(() => {
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas || canvasSize.w === 0) return

    const rotated = rotateImage(img, rotation)
    canvas.width = rotated.width
    canvas.height = rotated.height
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.drawImage(rotated, 0, 0)
  }, [file, rotation, canvasSize])

  // 旋转变化时，重置裁切框为整张旋转后的画布
  useEffect(() => {
    if (canvasSize.w > 0 && canvasSize.h > 0) {
      onCropChange({ x: 0, y: 0, width: canvasSize.w, height: canvasSize.h })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize.w, canvasSize.h])

  // 计算显示缩放比例（画布实际像素 → 显示像素）
  const getScale = useCallback((): { sx: number; sy: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { sx: 1, sy: 1 }
    const rect = canvas.getBoundingClientRect()
    return {
      sx: rect.width / canvas.width,
      sy: rect.height / canvas.height,
    }
  }, [])

  // 开始拖拽某条边
  const handleEdgeMouseDown = useCallback(
    (edge: DragEdge, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current = {
        edge,
        startX: e.clientX,
        startY: e.clientY,
        startRect: { ...cropRect },
      }
    },
    [cropRect]
  )

  // 鼠标移动：更新裁切框
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current
      if (!drag || !drag.edge) return

      const { sx, sy } = getScale()
      const dx = (e.clientX - drag.startX) / sx
      const dy = (e.clientY - drag.startY) / sy

      let { x, y, width, height } = drag.startRect

      switch (drag.edge) {
        case 'left':
          x = drag.startRect.x + dx
          width = drag.startRect.width - dx
          if (width < MIN_CROP_SIZE) {
            x = drag.startRect.x + drag.startRect.width - MIN_CROP_SIZE
            width = MIN_CROP_SIZE
          }
          if (x < 0) {
            width += x
            x = 0
          }
          break
        case 'right':
          width = drag.startRect.width + dx
          if (width < MIN_CROP_SIZE) width = MIN_CROP_SIZE
          if (x + width > canvasSize.w) width = canvasSize.w - x
          break
        case 'top':
          y = drag.startRect.y + dy
          height = drag.startRect.height - dy
          if (height < MIN_CROP_SIZE) {
            y = drag.startRect.y + drag.startRect.height - MIN_CROP_SIZE
            height = MIN_CROP_SIZE
          }
          if (y < 0) {
            height += y
            y = 0
          }
          break
        case 'bottom':
          height = drag.startRect.height + dy
          if (height < MIN_CROP_SIZE) height = MIN_CROP_SIZE
          if (y + height > canvasSize.h) height = canvasSize.h - y
          break
      }

      onCropChange({ x, y, width, height })
    }

    const handleMouseUp = () => {
      dragRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [getScale, canvasSize.w, canvasSize.h, onCropChange])

  // 将画布坐标转为显示百分比（用于定位裁切框）
  const cropStyle: React.CSSProperties = {
    left: `${(cropRect.x / canvasSize.w) * 100}%`,
    top: `${(cropRect.y / canvasSize.h) * 100}%`,
    width: `${(cropRect.width / canvasSize.w) * 100}%`,
    height: `${(cropRect.height / canvasSize.h) * 100}%`,
  }

  const handleRotateSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    onRotationChange(Number(e.target.value))
  }

  const quickRotate = (deg: number) => {
    onRotationChange(((rotation % 360) + 360) % 360 === deg ? 0 : deg)
  }

  const resetCrop = () => {
    onCropChange({ x: 0, y: 0, width: canvasSize.w, height: canvasSize.h })
  }

  return (
    <div className="space-y-3">
      {/* 旋转控制 */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          旋转角度：
        </label>
        <input
          type="range"
          min={0}
          max={360}
          value={rotation}
          onChange={handleRotateSlider}
          className="flex-1 min-w-[120px] accent-blue-600"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400 w-14 text-right tabular-nums">
          {rotation}°
        </span>
        <div className="flex gap-1">
          {[0, 90, 180, 270].map((deg) => (
            <button
              key={deg}
              onClick={() => quickRotate(deg)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                ((rotation % 360) + 360) % 360 === deg
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>

      {/* 画布 + 裁切框 */}
      <div
        ref={containerRef}
        className="relative inline-block max-w-full bg-gray-100 dark:bg-gray-900 rounded overflow-hidden select-none"
        style={{ lineHeight: 0 }}
      >
        <canvas
          ref={canvasRef}
          className="block max-w-full h-auto"
          style={{ maxHeight: '60vh' }}
        />
        {canvasSize.w > 0 && (
          <div
            className="absolute border-2 border-blue-500 pointer-events-none"
            style={cropStyle}
          >
            {/* 半透明遮罩通过 box-shadow 实现 */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }}
            />
            {/* 四条拖拽边 */}
            <div
              className="absolute left-0 right-0 top-0 h-2 -mt-1 cursor-ns-resize pointer-events-auto"
              onMouseDown={(e) => handleEdgeMouseDown('top', e)}
            />
            <div
              className="absolute left-0 right-0 bottom-0 h-2 -mb-1 cursor-ns-resize pointer-events-auto"
              onMouseDown={(e) => handleEdgeMouseDown('bottom', e)}
            />
            <div
              className="absolute top-0 bottom-0 left-0 w-2 -ml-1 cursor-ew-resize pointer-events-auto"
              onMouseDown={(e) => handleEdgeMouseDown('left', e)}
            />
            <div
              className="absolute top-0 bottom-0 right-0 w-2 -mr-1 cursor-ew-resize pointer-events-auto"
              onMouseDown={(e) => handleEdgeMouseDown('right', e)}
            />
          </div>
        )}
      </div>

      {/* 裁切信息 + 重置按钮 */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>
          裁切区域：{Math.round(cropRect.width)}×{Math.round(cropRect.height)}px
          （位置 {Math.round(cropRect.x)},{Math.round(cropRect.y)}）
        </span>
        <button
          onClick={resetCrop}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
        >
          重置裁切
        </button>
      </div>
    </div>
  )
}
