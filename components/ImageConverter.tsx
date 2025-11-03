'use client'

import { useState, useRef, useCallback } from 'react'
import JSZip from 'jszip'
import { convertImage, type OutputFormat } from '@/utils/imageConverter'

// 支持的输入图片类型（扩展更多格式）
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
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]

// 支持的文件扩展名
const ACCEPTED_EXTENSIONS = [
  '.jpg', '.jpeg', '.jfif',
  '.webp',
  '.png',
  '.gif',
  '.bmp',
  '.tiff', '.tif',
  '.svg',
  '.ico',
]

// 文件信息接口
interface FileInfo {
  file: File
  convertedBlob: Blob | null
  convertedUrl: string | null
  name: string
  status: 'pending' | 'converting' | 'completed' | 'error'
  error?: string
}

export default function ImageConverter() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpg')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理文件转换
  const processFiles = useCallback(async (filesToProcess: FileInfo[]) => {
    setIsProcessing(true)

    const updatedFiles = await Promise.all(
      filesToProcess.map(async (fileInfo) => {
        // 如果已经转换完成，跳过
        if (fileInfo.status === 'completed' && fileInfo.convertedBlob) {
          return fileInfo
        }

        // 更新状态为转换中
        const currentFile: FileInfo = { ...fileInfo, status: 'converting' }
        setFiles(prev => prev.map(f => f.file === fileInfo.file ? currentFile : f))

        try {
          // 转换为指定格式
          const convertedBlob = await convertImage(fileInfo.file, outputFormat)
          const convertedUrl = URL.createObjectURL(convertedBlob)

          return {
            ...fileInfo,
            convertedBlob: convertedBlob,
            convertedUrl: convertedUrl,
            status: 'completed' as const,
          }
        } catch (error) {
          console.error('转换失败:', error)
          return {
            ...fileInfo,
            status: 'error' as const,
            error: error instanceof Error ? error.message : '转换失败',
          }
        }
      })
    )

    setFiles(prev => {
      // 合并更新后的文件状态
      const fileMap = new Map(updatedFiles.map(f => [f.file, f]))
      return prev.map(f => fileMap.get(f.file) || f)
    })
    setIsProcessing(false)
  }, [outputFormat])

  // 处理文件选择
  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return

    const newFiles: FileInfo[] = Array.from(selectedFiles)
      .filter(file => {
        // 检查文件类型和扩展名
        const lowerName = file.name.toLowerCase()
        const isValidType = ACCEPTED_TYPES.includes(file.type) || 
          ACCEPTED_EXTENSIONS.some(ext => lowerName.endsWith(ext))
        
        if (!isValidType) {
          alert(`文件 ${file.name} 不是支持的格式。支持的格式：JPG、JFIF、WebP、PNG、GIF、BMP、TIFF、SVG、ICO`)
          return false
        }
        return true
      })
      .map(file => {
        // 获取文件扩展名并生成新的文件名
        const fileName = file.name
        const lastDot = fileName.lastIndexOf('.')
        const baseName = lastDot > 0 ? fileName.substring(0, lastDot) : fileName
        const newFileName = `${baseName}.${outputFormat}`
        
        return {
          file,
          convertedBlob: null,
          convertedUrl: null,
          name: newFileName,
          status: 'pending' as const,
        }
      })

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles])
      // 自动开始转换新添加的文件
      await processFiles(newFiles)
    }
  }, [processFiles, outputFormat])


  // 处理拖拽事件
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  // 单个文件下载
  const handleDownload = useCallback((fileInfo: FileInfo) => {
    if (!fileInfo.convertedBlob || !fileInfo.convertedUrl) return

    const link = document.createElement('a')
    link.href = fileInfo.convertedUrl
    link.download = fileInfo.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  // 批量打包下载
  const handleBatchDownload = useCallback(async () => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.convertedBlob)
    
    if (completedFiles.length === 0) {
      alert('没有可下载的文件')
      return
    }

    try {
      const zip = new JSZip()
      
      // 将所有转换后的文件添加到 ZIP
      completedFiles.forEach((fileInfo, index) => {
        if (fileInfo.convertedBlob) {
          zip.file(fileInfo.name, fileInfo.convertedBlob)
        }
      })

      // 生成 ZIP 文件并下载
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipUrl = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = zipUrl
      link.download = `converted_images_${Date.now()}.zip`
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
    // 清理 URL 对象
    if (fileInfo.convertedUrl) {
      URL.revokeObjectURL(fileInfo.convertedUrl)
    }
    setFiles(prev => prev.filter(f => f.file !== fileInfo.file))
  }, [])

  // 清空所有文件
  const handleClear = useCallback(() => {
    files.forEach(fileInfo => {
      if (fileInfo.convertedUrl) {
        URL.revokeObjectURL(fileInfo.convertedUrl)
      }
    })
    setFiles([])
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
          accept=".jpg,.jpeg,.jfif,.webp,.png,.gif,.bmp,.tiff,.tif,.svg,.ico,image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <div className="space-y-4">
          <div className="text-5xl mb-4">📁</div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            拖拽图片到此处或点击选择文件
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            支持 JPG、JFIF、WebP、PNG、GIF、BMP、TIFF、SVG、ICO 等格式，可多选
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
                  onClick={async () => {
                    setOutputFormat(format)
                    // 如果已有文件，重新转换
                    if (files.length > 0) {
                      // 清理旧的 URL
                      files.forEach(f => {
                        if (f.convertedUrl) {
                          URL.revokeObjectURL(f.convertedUrl)
                        }
                      })
                      
                      // 更新文件名并重置状态
                      setFiles(prev => {
                        const updated = prev.map(f => {
                          const fileName = f.file.name
                          const lastDot = fileName.lastIndexOf('.')
                          const baseName = lastDot > 0 ? fileName.substring(0, lastDot) : fileName
                          const newFileName = `${baseName}.${format}`
                          // 确定新的状态：如果是 completed 或 pending，重置为 pending；否则保持原状态
                          const newStatus: 'pending' | 'converting' | 'completed' | 'error' = 
                            f.status === 'completed' || f.status === 'pending' ? 'pending' : f.status
                          return {
                            ...f,
                            name: newFileName,
                            status: newStatus,
                            convertedBlob: null,
                            convertedUrl: null,
                          }
                        })
                        
                        // 异步转换文件
                        setTimeout(() => {
                          const filesToConvert = updated.filter(f => f.status === 'pending')
                          if (filesToConvert.length > 0) {
                            processFiles(filesToConvert)
                          }
                        }, 100)
                        
                        return updated
                      })
                    }
                  }}
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
              共 {files.length} 个文件，{files.filter(f => f.status === 'completed').length} 个已转换完成
            </div>
            <div className="flex gap-2">
              {files.filter(f => f.status === 'completed').length > 0 && (
                <button
                  onClick={handleBatchDownload}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  打包下载 ({files.filter(f => f.status === 'completed').length})
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      → {fileInfo.name}
                    </p>
                    <div className="mt-2">
                      {fileInfo.status === 'pending' && (
                        <span className="text-xs text-gray-500">等待转换...</span>
                      )}
                      {fileInfo.status === 'converting' && (
                        <span className="text-xs text-blue-600">转换中...</span>
                      )}
                      {fileInfo.status === 'completed' && (
                        <span className="text-xs text-green-600">转换完成</span>
                      )}
                      {fileInfo.status === 'error' && (
                        <span className="text-xs text-red-600">
                          转换失败: {fileInfo.error}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {fileInfo.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(fileInfo)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors font-medium"
                      >
                        下载
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(fileInfo)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors font-medium"
                    >
                      移除
                    </button>
                  </div>
                </div>
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
            <span className="text-sm">正在转换图片...</span>
          </div>
        </div>
      )}
    </div>
  )
}

