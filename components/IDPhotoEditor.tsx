'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { CropParams, AdjustParams, IDPhotoSize, ID_PHOTO_SIZES, BackgroundColor } from '@/utils/idPhotoProcessor'
import { BACKGROUND_COLORS } from '@/utils/backgroundReplacer'

// 编辑器属性接口
interface IDPhotoEditorProps {
  imageUrl: string // 图片 URL
  imageFile: File // 原始图片文件
  size: IDPhotoSize // 证件照尺寸
  onCropChange?: (crop: CropParams) => void // 裁剪参数变化回调
  onAdjustChange?: (adjust: AdjustParams) => void // 调整参数变化回调
  onBackgroundChange?: (backgroundColor: BackgroundColor | null) => void // 背景颜色变化回调
  onExport?: (blob: Blob) => void // 导出回调
}

export default function IDPhotoEditor({
  imageUrl,
  imageFile,
  size,
  onCropChange,
  onAdjustChange,
  onBackgroundChange,
  onExport,
}: IDPhotoEditorProps) {
  // 图片容器引用
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // 裁剪参数
  const [crop, setCrop] = useState<CropParams>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  })

  // 调整参数
  const [adjust, setAdjust] = useState<AdjustParams>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
  })

  // 图片尺寸和缩放信息
  const [imageInfo, setImageInfo] = useState<{
    naturalWidth: number
    naturalHeight: number
    displayWidth: number
    displayHeight: number
    scale: number
  } | null>(null)

  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)

  // 自动检测状态
  const [isDetecting, setIsDetecting] = useState(false)

  // 背景颜色状态
  const [backgroundColor, setBackgroundColor] = useState<BackgroundColor | null>(null)

  // 使用 ref 保存回调函数，避免在依赖项中引用
  const onCropChangeRef = useRef(onCropChange)
  useEffect(() => {
    onCropChangeRef.current = onCropChange
  }, [onCropChange])

  // 初始化标志，防止重复初始化
  const initializedRef = useRef(false)

  // 初始化图片信息
  useEffect(() => {
    const img = imageRef.current
    if (!img || initializedRef.current) return

    const handleLoad = () => {
      const container = containerRef.current
      if (!container) return

      // 计算显示尺寸（保持宽高比，最大宽度 600px）
      const maxWidth = 600
      const naturalWidth = img.naturalWidth
      const naturalHeight = img.naturalHeight
      const scale = Math.min(maxWidth / naturalWidth, 1)
      const displayWidth = naturalWidth * scale
      const displayHeight = naturalHeight * scale

      setImageInfo({
        naturalWidth,
        naturalHeight,
        displayWidth,
        displayHeight,
        scale,
      })

      // 初始化裁剪区域（居中，保持目标宽高比）
      // 获取目标证件照的宽高比
      const targetAspectRatio = ID_PHOTO_SIZES[size].width / ID_PHOTO_SIZES[size].height
      const imageAspectRatio = naturalWidth / naturalHeight
      
      // 根据图片和目标的宽高比，计算合适的裁剪尺寸
      let cropWidth: number
      let cropHeight: number
      
      if (imageAspectRatio > targetAspectRatio) {
        // 图片更宽，以高度为准
        cropHeight = naturalHeight * 0.8
        cropWidth = cropHeight * targetAspectRatio
      } else {
        // 图片更高，以宽度为准
        cropWidth = naturalWidth * 0.8
        cropHeight = cropWidth / targetAspectRatio
      }
      
      // 确保不超过图片尺寸
      if (cropWidth > naturalWidth) {
        cropWidth = naturalWidth
        cropHeight = cropWidth / targetAspectRatio
      }
      if (cropHeight > naturalHeight) {
        cropHeight = naturalHeight
        cropWidth = cropHeight * targetAspectRatio
      }
      
      const cropX = (naturalWidth - cropWidth) / 2
      const cropY = (naturalHeight - cropHeight) / 2

      const initialCrop: CropParams = {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      }

      setCrop(initialCrop)
      // 使用 ref 调用回调，避免触发依赖更新
      onCropChangeRef.current?.(initialCrop)
      initializedRef.current = true
    }

    if (img.complete) {
      handleLoad()
    } else {
      img.addEventListener('load', handleLoad)
      return () => img.removeEventListener('load', handleLoad)
    }
  }, [imageUrl])

  // 当 imageUrl 改变时，重置初始化标志
  useEffect(() => {
    initializedRef.current = false
  }, [imageUrl])

  // 将显示坐标转换为图片坐标
  const displayToImage = useCallback(
    (displayX: number, displayY: number): [number, number] => {
      if (!imageInfo) return [0, 0]
      const imageX = (displayX / imageInfo.displayWidth) * imageInfo.naturalWidth
      const imageY = (displayY / imageInfo.displayHeight) * imageInfo.naturalHeight
      return [imageX, imageY]
    },
    [imageInfo]
  )

  // 将图片坐标转换为显示坐标
  const imageToDisplay = useCallback(
    (imageX: number, imageY: number): [number, number] => {
      if (!imageInfo) return [0, 0]
      const displayX = (imageX / imageInfo.naturalWidth) * imageInfo.displayWidth
      const displayY = (imageY / imageInfo.naturalHeight) * imageInfo.displayHeight
      return [displayX, displayY]
    },
    [imageInfo]
  )


  // 拖拽初始裁剪位置（用于计算相对移动）
  const [dragStartCrop, setDragStartCrop] = useState<CropParams | null>(null)
  
  // 获取目标证件照的宽高比
  const targetAspectRatio = ID_PHOTO_SIZES[size].width / ID_PHOTO_SIZES[size].height

  // 处理鼠标移动事件
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!imageInfo || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const dx = x - dragStart.x
      const dy = y - dragStart.y

      if (isDragging && dragStartCrop) {
        // 移动裁剪框
        // 将显示坐标的增量转换为图片坐标的增量
        const [deltaImageX, deltaImageY] = displayToImage(dx, dy)
        
        // 计算新的裁剪位置（基于初始位置）
        let newX = dragStartCrop.x + deltaImageX
        let newY = dragStartCrop.y + deltaImageY
        
        // 限制在图片范围内
        newX = Math.max(0, Math.min(newX, imageInfo.naturalWidth - dragStartCrop.width))
        newY = Math.max(0, Math.min(newY, imageInfo.naturalHeight - dragStartCrop.height))
        
        const newCrop: CropParams = {
          ...dragStartCrop,
          x: newX,
          y: newY,
        }
        setCrop(newCrop)
        onCropChange?.(newCrop)
      } else if (isResizing && resizeHandle && dragStartCrop) {
        // 调整裁剪框大小，保持目标宽高比
        const [deltaImageX, deltaImageY] = displayToImage(dx, dy)

        let newWidth = dragStartCrop.width
        let newHeight = dragStartCrop.height
        let newX = dragStartCrop.x
        let newY = dragStartCrop.y

        // 根据拖动的角来计算新的大小
        if (resizeHandle === 'left-top') {
          // 左上角：同时改变宽度和高度
          // 使用较大的变化量作为主要变化方向
          const delta = Math.abs(deltaImageX) > Math.abs(deltaImageY) ? deltaImageX : deltaImageY
          newWidth = dragStartCrop.width - delta
          newHeight = newWidth / targetAspectRatio
          newX = dragStartCrop.x + (dragStartCrop.width - newWidth)
          newY = dragStartCrop.y + (dragStartCrop.height - newHeight)
        } else if (resizeHandle === 'right-top') {
          // 右上角：向右拖动增加宽度，向上拖动减少高度
          const delta = Math.abs(deltaImageX) > Math.abs(deltaImageY) ? deltaImageX : -deltaImageY
          newWidth = dragStartCrop.width + delta
          newHeight = newWidth / targetAspectRatio
          newX = dragStartCrop.x
          newY = dragStartCrop.y + (dragStartCrop.height - newHeight)
        } else if (resizeHandle === 'left-bottom') {
          // 左下角
          const delta = Math.abs(deltaImageX) > Math.abs(deltaImageY) ? deltaImageX : -deltaImageY
          newWidth = dragStartCrop.width - delta
          newHeight = newWidth / targetAspectRatio
          newX = dragStartCrop.x + (dragStartCrop.width - newWidth)
          newY = dragStartCrop.y
        } else if (resizeHandle === 'right-bottom') {
          // 右下角
          const delta = Math.abs(deltaImageX) > Math.abs(deltaImageY) ? deltaImageX : deltaImageY
          newWidth = dragStartCrop.width + delta
          newHeight = newWidth / targetAspectRatio
          newX = dragStartCrop.x
          newY = dragStartCrop.y
        }

        // 确保最小尺寸
        const minSize = 50
        if (newWidth < minSize) {
          newWidth = minSize
          newHeight = newWidth / targetAspectRatio
          // 重新计算位置以保持拖动角的位置
          if (resizeHandle.includes('left')) {
            newX = dragStartCrop.x + (dragStartCrop.width - newWidth)
          }
          if (resizeHandle.includes('top')) {
            newY = dragStartCrop.y + (dragStartCrop.height - newHeight)
          }
        }
        if (newHeight < minSize) {
          newHeight = minSize
          newWidth = newHeight * targetAspectRatio
          // 重新计算位置以保持拖动角的位置
          if (resizeHandle.includes('left')) {
            newX = dragStartCrop.x + (dragStartCrop.width - newWidth)
          }
          if (resizeHandle.includes('top')) {
            newY = dragStartCrop.y + (dragStartCrop.height - newHeight)
          }
        }

        // 限制在图片范围内
        if (newX < 0) {
          newX = 0
          if (resizeHandle.includes('left')) {
            newWidth = dragStartCrop.width + dragStartCrop.x
            newHeight = newWidth / targetAspectRatio
            if (resizeHandle.includes('top')) {
              newY = dragStartCrop.y + (dragStartCrop.height - newHeight)
            }
          }
        }
        if (newY < 0) {
          newY = 0
          if (resizeHandle.includes('top')) {
            newHeight = dragStartCrop.height + dragStartCrop.y
            newWidth = newHeight * targetAspectRatio
            if (resizeHandle.includes('left')) {
              newX = dragStartCrop.x + (dragStartCrop.width - newWidth)
            }
          }
        }
        if (newX + newWidth > imageInfo.naturalWidth) {
          newWidth = imageInfo.naturalWidth - newX
          newHeight = newWidth / targetAspectRatio
          if (newY + newHeight > imageInfo.naturalHeight) {
            newHeight = imageInfo.naturalHeight - newY
            newWidth = newHeight * targetAspectRatio
          }
        }
        if (newY + newHeight > imageInfo.naturalHeight) {
          newHeight = imageInfo.naturalHeight - newY
          newWidth = newHeight * targetAspectRatio
          if (newX + newWidth > imageInfo.naturalWidth) {
            newWidth = imageInfo.naturalWidth - newX
            newHeight = newWidth / targetAspectRatio
          }
        }

        const newCrop: CropParams = {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        }

        setCrop(newCrop)
        onCropChange?.(newCrop)
      }
    },
    [
      imageInfo,
      isDragging,
      isResizing,
      resizeHandle,
      dragStart,
      dragStartCrop,
      displayToImage,
      onCropChange,
      targetAspectRatio,
    ]
  )

  // 处理鼠标释放事件
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle(null)
    setDragStartCrop(null)
  }, [])

  // 监听鼠标事件
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  // 处理亮度变化
  const handleBrightnessChange = useCallback(
    (value: number) => {
      const newAdjust = { ...adjust, brightness: value }
      setAdjust(newAdjust)
      onAdjustChange?.(newAdjust)
    },
    [adjust, onAdjustChange]
  )

  // 处理对比度变化
  const handleContrastChange = useCallback(
    (value: number) => {
      const newAdjust = { ...adjust, contrast: value }
      setAdjust(newAdjust)
      onAdjustChange?.(newAdjust)
    },
    [adjust, onAdjustChange]
  )

  // 处理饱和度变化
  const handleSaturationChange = useCallback(
    (value: number) => {
      const newAdjust = { ...adjust, saturation: value }
      setAdjust(newAdjust)
      onAdjustChange?.(newAdjust)
    },
    [adjust, onAdjustChange]
  )

  // 处理背景颜色变化
  const handleBackgroundChange = useCallback(
    (color: BackgroundColor | null) => {
      setBackgroundColor(color)
      onBackgroundChange?.(color)
    },
    [onBackgroundChange]
  )

  // 自动检测人脸并设置裁剪区域
  const handleAutoDetect = useCallback(async () => {
    if (!imageInfo) return

    setIsDetecting(true)
    try {
      // 获取目标尺寸的宽高比
      const targetSize = ID_PHOTO_SIZES[size]
      const targetAspectRatio = targetSize.width / targetSize.height

      // 按需加载人脸检测模块，避免 face-api 进入图片工具首屏 bundle
      const { autoDetectAndCrop } = await import('@/utils/faceDetection')

      // 调用自动检测函数
      const cropParams = await autoDetectAndCrop(
        imageUrl,
        imageInfo.naturalWidth,
        imageInfo.naturalHeight,
        targetAspectRatio
      )

      if (cropParams) {
        // 更新裁剪区域
        setCrop(cropParams)
        onCropChange?.(cropParams)
      } else {
        alert('未检测到人脸，请手动调整裁剪区域')
      }
    } catch (error) {
      console.error('自动检测失败:', error)
      alert('自动检测失败，请检查网络连接或手动调整裁剪区域')
    } finally {
      setIsDetecting(false)
    }
  }, [imageInfo, imageUrl, size, onCropChange])

  // 获取裁剪框的显示样式
  const getCropStyle = () => {
    if (!imageInfo) return {}
    const [x, y] = imageToDisplay(crop.x, crop.y)
    const [width, height] = imageToDisplay(crop.width, crop.height)
    return {
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
    }
  }

  // 获取图片滤镜样式
  const getImageStyle = () => {
    const brightness = (adjust.brightness + 100) / 100
    const contrast = (adjust.contrast + 100) / 100
    const saturation = (adjust.saturation + 100) / 100
    
    const filters: string[] = []
    filters.push(`brightness(${brightness})`)
    filters.push(`contrast(${contrast})`)
    filters.push(`saturate(${saturation})`)
    
    return {
      filter: filters.join(' '),
    }
  }

  return (
    <div className="space-y-4">
      {/* 图片预览和裁剪区域 */}
      <div
        ref={containerRef}
        className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden"
        style={{ width: imageInfo?.displayWidth || 'auto', margin: '0 auto' }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="预览"
          className="block"
          style={{
            width: imageInfo?.displayWidth || 'auto',
            height: imageInfo?.displayHeight || 'auto',
            ...getImageStyle(),
          }}
          draggable={false}
        />

        {/* 裁剪框 */}
        {imageInfo && (
          <div
            className="absolute border-2 border-blue-500 cursor-move z-10"
            style={getCropStyle()}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              
              // 检查是否点击在手柄上（手柄区域更大一些）
              const target = e.target as HTMLElement
              if (target.classList.contains('resize-handle')) {
                // 如果是手柄，不处理，让手柄自己的事件处理
                return
              }
              
              // 移动裁剪框
              const rect = containerRef.current?.getBoundingClientRect()
              if (!rect) return
              
              setIsDragging(true)
              setDragStart({ 
                x: e.clientX - rect.left, 
                y: e.clientY - rect.top 
              })
              // 保存初始裁剪位置
              setDragStartCrop(crop)
            }}
          >
            {/* 调整大小的手柄 */}
            <div 
              className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-nw-resize z-20 resize-handle"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              setIsResizing(true)
              setResizeHandle('left-top')
              setDragStartCrop(crop)
              const rect = containerRef.current?.getBoundingClientRect()
              if (rect) {
                setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
              }
              }}
            />
            <div 
              className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-ne-resize z-20 resize-handle"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              setIsResizing(true)
              setResizeHandle('right-top')
              setDragStartCrop(crop)
              const rect = containerRef.current?.getBoundingClientRect()
              if (rect) {
                setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
              }
              }}
            />
            <div 
              className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-sw-resize z-20 resize-handle"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              setIsResizing(true)
              setResizeHandle('left-bottom')
              setDragStartCrop(crop)
              const rect = containerRef.current?.getBoundingClientRect()
              if (rect) {
                setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
              }
              }}
            />
            <div 
              className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize z-20 resize-handle"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              setIsResizing(true)
              setResizeHandle('right-bottom')
              setDragStartCrop(crop)
              const rect = containerRef.current?.getBoundingClientRect()
              if (rect) {
                setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
              }
              }}
            />
          </div>
        )}
      </div>

      {/* 调整参数控制 */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md space-y-4">
        {/* 自动检测按钮 */}
        <div className="flex justify-center">
          <button
            onClick={handleAutoDetect}
            disabled={isDetecting || !imageInfo}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {isDetecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>检测中...</span>
              </>
            ) : (
              <>
                <span>🤖</span>
                <span>自动检测人脸</span>
              </>
            )}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            亮度: {adjust.brightness}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={adjust.brightness}
            onChange={(e) => handleBrightnessChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            对比度: {adjust.contrast}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={adjust.contrast}
            onChange={(e) => handleContrastChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            饱和度: {adjust.saturation}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={adjust.saturation}
            onChange={(e) => handleSaturationChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* 背景颜色选择器 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            背景颜色（智能抠图换背景）
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBackgroundChange(null)}
              className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
                backgroundColor === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              原图背景
            </button>
            {(Object.keys(BACKGROUND_COLORS) as BackgroundColor[]).map((color) => {
              const config = BACKGROUND_COLORS[color]
              return (
                <button
                  key={color}
                  onClick={() => handleBackgroundChange(color)}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm border-2 ${
                    backgroundColor === color
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-transparent bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  style={{
                    backgroundColor: backgroundColor === color ? config.hex : undefined,
                    color: backgroundColor === color ? '#000' : undefined,
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-4 h-4 rounded-full border border-gray-400"
                      style={{ backgroundColor: config.hex }}
                    />
                    {config.name}
                  </span>
                </button>
              )
            })}
          </div>
          {backgroundColor && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              已选择 {BACKGROUND_COLORS[backgroundColor].name} 背景，处理时将自动调用 IMG.LY AI 背景去除引擎
            </p>
          )}
        </div>
      </div>

      {/* 操作提示 */}
      <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
        <p>• 点击"自动检测人脸"按钮，系统会自动定位人脸并设置裁剪区域</p>
        <p>• 拖动裁剪框来移动位置，拖动四角来调整大小（保持证件照比例）</p>
        <p>• 使用滑块调整图片参数：亮度、对比度、饱和度</p>
        <p>• 选择背景颜色后，系统会使用 IMG.LY 背景去除引擎自动替换背景（首次使用需加载模型文件，请耐心等待）</p>
      </div>
    </div>
  )
}

