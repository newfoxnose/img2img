'use client'

import { useState, useRef, useCallback } from 'react'
import JSZip from 'jszip'
import { splitImageToPortraits, type SplitInfo, type RotationOption, type CropDirection } from '@/utils/imageSplitter'
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

// 单张分割结果
interface SliceResult {
  blob: Blob
  url: string
  name: string
  index: number
}

// 文件信息接口
interface FileInfo {
  file: File
  previewUrl: string
  slices: SliceResult[]
  info: SplitInfo | null
  status: 'pending' | 'processing' | 'completed' | 'error'
  error?: string
}

export default function ImageSplitter() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpg')
  const [rotation, setRotation] = useState<RotationOption>(0)
  const [cropDirection, setCropDirection] = useState<CropDirection>('auto')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理文件分割（显式指定输出格式、旋转方向与裁切方向，避免 setTimeout 闭包捕获旧状态）
  const processFilesWith = useCallback(
    async (
      filesToProcess: FileInfo[],
      fmt: OutputFormat,
      rot: RotationOption,
      cropDir: CropDirection
    ) => {
      setIsProcessing(true)

      const updatedFiles = await Promise.all(
        filesToProcess.map(async (fileInfo) => {
          if (fileInfo.status === 'completed' && fileInfo.slices.length > 0) {
            return fileInfo
          }

          const currentFile: FileInfo = { ...fileInfo, status: 'processing' }
          setFiles((prev) =>
            prev.map((f) => (f.file === fileInfo.file ? currentFile : f))
          )

          try {
            const { blobs, info } = await splitImageToPortraits(
              fileInfo.file,
              fmt,
              rot,
              cropDir
            )

            const baseName = fileInfo.file.name.replace(/\.[^.]+$/, '')
            const slices: SliceResult[] = blobs.map((blob, i) => ({
              blob,
              url: URL.createObjectURL(blob),
              name: `${baseName}_${i + 1}.${fmt}`,
              index: i,
            }))

            return {
              ...fileInfo,
              slices,
              info,
              status: 'completed' as const,
            }
          } catch (error) {
            console.error('分割失败:', error)
            return {
              ...fileInfo,
              status: 'error' as const,
              error: error instanceof Error ? error.message : '分割失败',
            }
          }
        })
      )

      setFiles((prev) => {
        const fileMap = new Map(updatedFiles.map((f) => [f.file, f]))
        return prev.map((f) => fileMap.get(f.file) || f)
      })
      setIsProcessing(false)
    },
    []
  )

  // 使用当前状态处理文件
  const processFiles = useCallback(
    (filesToProcess: FileInfo[]) =>
      processFilesWith(filesToProcess, outputFormat, rotation, cropDirection),
    [outputFormat, rotation, cropDirection, processFilesWith]
  )

  // 处理文件选择
  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return

      const newFiles: FileInfo[] = Array.from(selectedFiles)
        .filter((file) => {
          const lowerName = file.name.toLowerCase()
          const isValidType =
            ACCEPTED_TYPES.includes(file.type) ||
            ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))

          if (!isValidType) {
            alert(`文件 ${file.name} 不是支持的格式。支持的格式：JPG、WebP、PNG、GIF、BMP、TIFF`)
            return false
          }
          return true
        })
        .map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
          slices: [],
          info: null,
          status: 'pending' as const,
        }))

      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles])
        await processFiles(newFiles)
      }
    },
    [processFiles]
  )

  // 拖拽事件
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

  // 单张下载
  const handleDownload = useCallback((slice: SliceResult) => {
    const link = document.createElement('a')
    link.href = slice.url
    link.download = slice.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  // 下载单个文件的所有分割结果
  const handleDownloadAllForFile = useCallback((fileInfo: FileInfo) => {
    fileInfo.slices.forEach((slice) => {
      const link = document.createElement('a')
      link.href = slice.url
      link.download = slice.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    })
  }, [])

  // 批量打包下载所有分割结果
  const handleBatchDownload = useCallback(async () => {
    const completedFiles = files.filter(
      (f) => f.status === 'completed' && f.slices.length > 0
    )

    if (completedFiles.length === 0) {
      alert('没有可下载的文件')
      return
    }

    try {
      const zip = new JSZip()

      completedFiles.forEach((fileInfo) => {
        fileInfo.slices.forEach((slice) => {
          zip.file(slice.name, slice.blob)
        })
      })

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipUrl = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = zipUrl
      link.download = `split_images_${Date.now()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(zipUrl)
    } catch (error) {
      console.error('打包失败:', error)
      alert('打包下载失败，请重试')
    }
  }, [files])

  // 移除文件
  const handleRemove = useCallback((fileInfo: FileInfo) => {
    if (fileInfo.previewUrl) URL.revokeObjectURL(fileInfo.previewUrl)
    fileInfo.slices.forEach((s) => URL.revokeObjectURL(s.url))
    setFiles((prev) => prev.filter((f) => f.file !== fileInfo.file))
  }, [])

  // 清空所有文件
  const handleClear = useCallback(() => {
    files.forEach((fileInfo) => {
      if (fileInfo.previewUrl) URL.revokeObjectURL(fileInfo.previewUrl)
      fileInfo.slices.forEach((s) => URL.revokeObjectURL(s.url))
    })
    setFiles([])
  }, [files])

  // 切换输出格式：重新分割已有文件
  const handleFormatChange = useCallback(
    async (format: OutputFormat) => {
      if (format === outputFormat) return
      setOutputFormat(format)

      if (files.length === 0) return

      // 清理旧的 slice URL
      files.forEach((f) => f.slices.forEach((s) => URL.revokeObjectURL(s.url)))

      setFiles((prev) => {
        const updated = prev.map((f) => ({
          ...f,
          slices: [],
          info: null,
          status: (f.status === 'completed' || f.status === 'pending'
            ? 'pending'
            : f.status) as FileInfo['status'],
        }))

        setTimeout(() => {
          const toProcess = updated.filter((f) => f.status === 'pending')
          if (toProcess.length > 0) {
            processFilesWith(toProcess, format, rotation, cropDirection)
          }
        }, 100)

        return updated
      })
    },
    [files, outputFormat, rotation, cropDirection, processFilesWith]
  )

  // 切换旋转方向：重新分割已有文件
  const handleRotationChange = useCallback(
    async (newRotation: RotationOption) => {
      if (newRotation === rotation) return
      setRotation(newRotation)

      if (files.length === 0) return

      // 清理旧的 slice URL
      files.forEach((f) => f.slices.forEach((s) => URL.revokeObjectURL(s.url)))

      setFiles((prev) => {
        const updated = prev.map((f) => ({
          ...f,
          slices: [],
          info: null,
          status: (f.status === 'completed' || f.status === 'pending'
            ? 'pending'
            : f.status) as FileInfo['status'],
        }))

        setTimeout(() => {
          const toProcess = updated.filter((f) => f.status === 'pending')
          if (toProcess.length > 0) {
            processFilesWith(toProcess, outputFormat, newRotation, cropDirection)
          }
        }, 100)

        return updated
      })
    },
    [files, rotation, outputFormat, cropDirection, processFilesWith]
  )

  // 切换裁切方向：重新分割已有文件
  const handleCropDirectionChange = useCallback(
    async (newCropDirection: CropDirection) => {
      if (newCropDirection === cropDirection) return
      setCropDirection(newCropDirection)

      if (files.length === 0) return

      // 清理旧的 slice URL
      files.forEach((f) => f.slices.forEach((s) => URL.revokeObjectURL(s.url)))

      setFiles((prev) => {
        const updated = prev.map((f) => ({
          ...f,
          slices: [],
          info: null,
          status: (f.status === 'completed' || f.status === 'pending'
            ? 'pending'
            : f.status) as FileInfo['status'],
        }))

        setTimeout(() => {
          const toProcess = updated.filter((f) => f.status === 'pending')
          if (toProcess.length > 0) {
            processFilesWith(toProcess, outputFormat, rotation, newCropDirection)
          }
        }, 100)

        return updated
      })
    },
    [files, cropDirection, outputFormat, rotation, processFilesWith]
  )

  const totalSlices = files.reduce(
    (sum, f) => sum + (f.status === 'completed' ? f.slices.length : 0),
    0
  )

  return (
    <div className="max-w-5xl mx-auto">
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
          accept=".jpg,.jpeg,.jfif,.webp,.png,.gif,.bmp,.tiff,.tif,image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <div className="space-y-4">
          <div className="text-5xl mb-4">🖼️</div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            拖拽横版图片到此处或点击选择文件
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            自动将横版照片分割为多张 3:4 竖版照片，左右两侧自动裁切以得到整数张
          </p>

          {/* 输出格式选择器 */}
          <div className="mt-4 flex flex-col items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              输出格式：
            </label>
            <div className="flex gap-2">
              {(['jpg', 'png', 'webp'] as OutputFormat[]).map((format) => (
                <button
                  key={format}
                  onClick={() => handleFormatChange(format)}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium uppercase ${
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

          {/* 原图旋转方向选择器 */}
          <div className="flex flex-col items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              原图旋转：
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: 0 as RotationOption, label: '不旋转' },
                  { value: 270 as RotationOption, label: '左转 90°' },
                  { value: 90 as RotationOption, label: '右转 90°' },
                ]
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleRotationChange(opt.value)}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                    rotation === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 裁切方向选择器 */}
          <div className="flex flex-col items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              裁切方向：
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: 'auto' as CropDirection, label: '自动' },
                  { value: 'leftright' as CropDirection, label: '裁切左右' },
                  { value: 'topbottom' as CropDirection, label: '裁切上下' },
                ]
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleCropDirectionChange(opt.value)}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                    cropDirection === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
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
              共 {files.length} 张原图，已生成 {totalSlices} 张竖版照片
            </div>
            <div className="flex gap-2">
              {totalSlices > 0 && (
                <button
                  onClick={handleBatchDownload}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  打包下载 ({totalSlices})
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
          <div className="space-y-6">
            {files.map((fileInfo, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {fileInfo.file.name}
                    </p>
                    {fileInfo.info && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {fileInfo.info.rotation !== 0 && (
                          <>
                            原图先{fileInfo.info.rotation === 270 ? '左转' : '右转'}90°（
                            {fileInfo.info.originalWidth}×
                            {fileInfo.info.originalHeight}px），
                          </>
                        )}
                        {fileInfo.info.rotation === 0 && (
                          <>原图 {fileInfo.info.originalWidth}×{fileInfo.info.originalHeight}px，</>
                        )}
                        分割为 {fileInfo.info.sliceCount} 张 3:4 竖版照片（
                        {Math.round(fileInfo.info.sliceWidth)}×
                        {Math.round(fileInfo.info.sliceHeight)}px），
                        {fileInfo.info.cropDirection === 'leftright'
                          ? `左右各裁切 ${Math.round(fileInfo.info.cropLeft)}px`
                          : `上下各裁切 ${Math.round(fileInfo.info.cropTop)}px`}
                      </p>
                    )}
                    <div className="mt-2">
                      {fileInfo.status === 'pending' && (
                        <span className="text-xs text-gray-500">等待分割...</span>
                      )}
                      {fileInfo.status === 'processing' && (
                        <span className="text-xs text-blue-600">分割中...</span>
                      )}
                      {fileInfo.status === 'completed' && (
                        <span className="text-xs text-green-600">分割完成</span>
                      )}
                      {fileInfo.status === 'error' && (
                        <span className="text-xs text-red-600">
                          分割失败: {fileInfo.error}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {fileInfo.status === 'completed' && fileInfo.slices.length > 0 && (
                      <button
                        onClick={() => handleDownloadAllForFile(fileInfo)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors font-medium"
                      >
                        全部下载
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(fileInfo)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors font-medium"
                    >
                      移除
                    </button>
                  </div>
                </div>

                {/* 分割结果预览 */}
                {fileInfo.slices.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {fileInfo.slices.map((slice) => (
                      <div
                        key={slice.index}
                        className="group relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
                      >
                        <div className="aspect-[3/4] flex items-center justify-center">
                          <img
                            src={slice.url}
                            alt={slice.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="p-2 text-center">
                          <p className="text-xs text-gray-600 dark:text-gray-300 truncate mb-1">
                            第 {slice.index + 1} 张
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
            <span className="text-sm">正在分割图片...</span>
          </div>
        </div>
      )}
    </div>
  )
}
