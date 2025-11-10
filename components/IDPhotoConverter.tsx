'use client'

import { useState, useRef, useCallback } from 'react'
import JSZip from 'jszip'
import IDPhotoEditor from './IDPhotoEditor'
import {
  processIDPhoto,
  setImageDPI,
  type IDPhotoSize,
  ID_PHOTO_SIZES,
  type CropParams,
  type AdjustParams,
  type BackgroundColor,
} from '@/utils/idPhotoProcessor'

// 支持的输入图片类型
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/jfif',
  'image/webp',
  'image/png',
  'image/gif',
  'image/bmp',
]

const ACCEPTED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.jfif',
  '.webp',
  '.png',
  '.gif',
  '.bmp',
]

// 文件信息接口
interface FileInfo {
  file: File
  previewUrl: string
  cropParams: CropParams
  adjustParams: AdjustParams
  backgroundColor: BackgroundColor | null
  processedBlob: Blob | null
  processedUrl: string | null
  status: 'pending' | 'processing' | 'completed' | 'error'
  error?: string
}

export default function IDPhotoConverter() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedSize, setSelectedSize] = useState<IDPhotoSize>('1inch')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 初始化裁剪参数（基于图片尺寸）
  const getInitialCropParams = useCallback(
    (imgWidth: number, imgHeight: number): CropParams => {
      // 初始裁剪区域为图片的 80%，居中
      const cropWidth = imgWidth * 0.8
      const cropHeight = imgHeight * 0.8
      const cropX = (imgWidth - cropWidth) / 2
      const cropY = (imgHeight - cropHeight) / 2

      return {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      }
    },
    []
  )

  // 处理文件选择
  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return

      const newFiles: FileInfo[] = []

      for (const file of Array.from(selectedFiles)) {
        // 检查文件类型
        const lowerName = file.name.toLowerCase()
        const isValidType =
          ACCEPTED_TYPES.includes(file.type) ||
          ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))

        if (!isValidType) {
          alert(
            `文件 ${file.name} 不是支持的格式。支持的格式：JPG、JFIF、WebP、PNG、GIF、BMP`
          )
          continue
        }

        // 第一步：设置图片 DPI 为 300
        let processedFile = file
        try {
          processedFile = await setImageDPI(file)
          console.log('DPI 已设置为 300:', file.name)
        } catch (error) {
          console.warn('设置 DPI 失败，使用原始文件:', error)
          // 如果设置失败，继续使用原始文件
          processedFile = file
        }

        // 使用处理后的文件创建预览 URL
        const previewUrl = URL.createObjectURL(processedFile)

        // 获取图片尺寸以初始化裁剪参数
        const img = new Image()
        img.src = previewUrl
        await new Promise((resolve) => {
          img.onload = () => {
            resolve(null)
          }
        })

        const cropParams = getInitialCropParams(img.naturalWidth, img.naturalHeight)

        newFiles.push({
          file: processedFile, // 使用处理后的文件（DPI 已设置为 300）
          previewUrl,
          cropParams,
          adjustParams: { 
            brightness: 0, 
            contrast: 0,
            saturation: 0,
          },
          backgroundColor: null,
          processedBlob: null,
          processedUrl: null,
          status: 'pending',
        })
      }

      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles])
      }
    },
    [getInitialCropParams]
  )

  // 处理拖拽事件
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  // 处理单个文件
  const handleProcessFile = useCallback(
    async (index: number) => {
      const fileInfo = files[index]
      if (!fileInfo) return

      setIsProcessing(true)
      setFiles((prev) => {
        const updated = [...prev]
        updated[index] = { ...updated[index], status: 'processing' }
        return updated
      })

      try {
        const blob = await processIDPhoto(
          fileInfo.file,
          selectedSize,
          fileInfo.cropParams,
          fileInfo.adjustParams,
          fileInfo.backgroundColor || undefined
        )

        const processedUrl = URL.createObjectURL(blob)

        setFiles((prev) => {
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            processedBlob: blob,
            processedUrl,
            status: 'completed',
          }
          return updated
        })
      } catch (error) {
        console.error('处理失败:', error)
        setFiles((prev) => {
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            status: 'error',
            error:
              error instanceof Error ? error.message : '处理失败',
          }
          return updated
        })
      } finally {
        setIsProcessing(false)
      }
    },
    [files, selectedSize]
  )

  // 批量处理所有文件
  const handleBatchProcess = useCallback(async () => {
    setIsProcessing(true)

    for (let i = 0; i < files.length; i++) {
      await handleProcessFile(i)
    }

    setIsProcessing(false)
  }, [files, handleProcessFile])

  // 更新裁剪参数
  const handleCropChange = useCallback(
    (index: number, crop: CropParams) => {
      setFiles((prev) => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          cropParams: crop,
          processedBlob: null,
          processedUrl: null,
          status: 'pending',
        }
        return updated
      })
    },
    []
  )

  // 更新调整参数
  const handleAdjustChange = useCallback(
    (index: number, adjust: AdjustParams) => {
      setFiles((prev) => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          adjustParams: adjust,
          processedBlob: null,
          processedUrl: null,
          status: 'pending',
        }
        return updated
      })
    },
    []
  )

  // 更新背景颜色
  const handleBackgroundChange = useCallback(
    (index: number, backgroundColor: BackgroundColor | null) => {
      setFiles((prev) => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          backgroundColor,
          processedBlob: null,
          processedUrl: null,
          status: 'pending',
        }
        return updated
      })
    },
    []
  )

  // 单个文件下载
  const handleDownload = useCallback((fileInfo: FileInfo, index: number) => {
    if (!fileInfo.processedBlob || !fileInfo.processedUrl) {
      // 如果还没有处理，先处理
      handleProcessFile(index)
      return
    }

    const sizeName = ID_PHOTO_SIZES[selectedSize].name
    const link = document.createElement('a')
    link.href = fileInfo.processedUrl
    link.download = `${fileInfo.file.name.replace(/\.[^/.]+$/, '')}_${sizeName}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [selectedSize, handleProcessFile])

  // 批量打包下载
  const handleBatchDownload = useCallback(async () => {
    // 先处理所有未处理的文件
    const unprocessedFiles = files.filter(
      (f) => f.status === 'pending' || f.status === 'error'
    )
    if (unprocessedFiles.length > 0) {
      await handleBatchProcess()
    }

    const completedFiles = files.filter(
      (f) => f.status === 'completed' && f.processedBlob
    )

    if (completedFiles.length === 0) {
      alert('没有可下载的文件，请先处理图片')
      return
    }

    try {
      const zip = new JSZip()
      const sizeName = ID_PHOTO_SIZES[selectedSize].name

      completedFiles.forEach((fileInfo, index) => {
        if (fileInfo.processedBlob) {
          const fileName = fileInfo.file.name.replace(/\.[^/.]+$/, '')
          zip.file(`${fileName}_${sizeName}.jpg`, fileInfo.processedBlob)
        }
      })

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipUrl = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = zipUrl
      link.download = `id_photos_${sizeName}_${Date.now()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(zipUrl)
    } catch (error) {
      console.error('打包失败:', error)
      alert('打包下载失败，请重试')
    }
  }, [files, selectedSize, handleBatchProcess])

  // 移除文件
  const handleRemove = useCallback((index: number) => {
    setFiles((prev) => {
      const fileInfo = prev[index]
      if (fileInfo) {
        URL.revokeObjectURL(fileInfo.previewUrl)
        if (fileInfo.processedUrl) {
          URL.revokeObjectURL(fileInfo.processedUrl)
        }
      }
      return prev.filter((_, i) => i !== index)
    })

    // 如果正在编辑这个文件，关闭编辑器
    if (editingIndex === index) {
      setEditingIndex(null)
    } else if (editingIndex !== null && editingIndex > index) {
      // 如果编辑的文件索引大于删除的索引，需要调整
      setEditingIndex(editingIndex - 1)
    }
  }, [editingIndex])

  // 清空所有文件
  const handleClear = useCallback(() => {
    files.forEach((fileInfo) => {
      URL.revokeObjectURL(fileInfo.previewUrl)
      if (fileInfo.processedUrl) {
        URL.revokeObjectURL(fileInfo.processedUrl)
      }
    })
    setFiles([])
    setEditingIndex(null)
  }, [files])

  return (
    <div className="max-w-4xl mx-auto">
      {/* 上传区域 */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 md:p-12 text-center transition-colors ${
          isDragging
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
          multiple
          accept=".jpg,.jpeg,.jfif,.webp,.png,.gif,.bmp,image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <div className="space-y-4">
          <div className="text-5xl mb-4">📷</div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            拖拽照片到此处或点击选择文件
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            支持 JPG、JFIF、WebP、PNG、GIF、BMP 等格式，可多选
          </p>

          {/* 尺寸选择器 */}
          <div className="mt-4 flex flex-col items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              证件照尺寸：
            </label>
            <div className="flex gap-2">
              {(Object.keys(ID_PHOTO_SIZES) as IDPhotoSize[]).map((size) => {
                const config = ID_PHOTO_SIZES[size]
                return (
                  <button
                    key={size}
                    onClick={() => {
                      setSelectedSize(size)
                      // 重置所有文件状态，需要重新处理
                      setFiles((prev) =>
                        prev.map((f) => ({
                          ...f,
                          processedBlob: null,
                          processedUrl: null,
                          status: 'pending',
                        }))
                      )
                    }}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      selectedSize === size
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {config.name} (宽{config.width}×高{config.height}px)
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            选择文件
          </button>
        </div>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="mt-8 space-y-4">
          {/* 操作按钮栏 */}
          <div className="flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              共 {files.length} 个文件，{' '}
              {files.filter((f) => f.status === 'completed').length} 个已处理完成
            </div>
            <div className="flex gap-2">
              {files.length > 0 && (
                <button
                  onClick={handleBatchProcess}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  批量处理
                </button>
              )}
              {files.filter((f) => f.status === 'completed').length > 0 && (
                <button
                  onClick={handleBatchDownload}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  打包下载 (
                  {files.filter((f) => f.status === 'completed').length})
                </button>
              )}
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
              >
                清空列表
              </button>
            </div>
          </div>

          {/* 文件项列表 */}
          <div className="space-y-3">
            {files.map((fileInfo, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {fileInfo.file.name}
                    </p>
                    <div className="mt-2">
                      {fileInfo.status === 'pending' && (
                        <span className="text-xs text-gray-500">等待处理...</span>
                      )}
                      {fileInfo.status === 'processing' && (
                        <span className="text-xs text-blue-600">处理中...</span>
                      )}
                      {fileInfo.status === 'completed' && (
                        <span className="text-xs text-green-600">处理完成</span>
                      )}
                      {fileInfo.status === 'error' && (
                        <span className="text-xs text-red-600">
                          处理失败: {fileInfo.error}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors font-medium"
                    >
                      {editingIndex === index ? '关闭编辑' : '编辑'}
                    </button>
                    {fileInfo.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(fileInfo, index)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors font-medium"
                      >
                        下载
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(index)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors font-medium"
                    >
                      移除
                    </button>
                  </div>
                </div>

                {/* 编辑器 */}
                {editingIndex === index && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <IDPhotoEditor
                      imageUrl={fileInfo.previewUrl}
                      imageFile={fileInfo.file}
                      size={selectedSize}
                      onCropChange={(crop) => handleCropChange(index, crop)}
                      onAdjustChange={(adjust) => handleAdjustChange(index, adjust)}
                      onBackgroundChange={(backgroundColor) => handleBackgroundChange(index, backgroundColor)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 处理中提示 */}
      {isProcessing && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm">正在处理图片...</span>
          </div>
        </div>
      )}
    </div>
  )
}

