'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import JSZip from 'jszip'
import CameraUploadButton from '@/components/shared/CameraUploadButton'
import {
  convertImageWithInfo,
  type OutputFormat,
  type ConvertOptions,
  type WatermarkPosition,
} from '@/utils/imageConverter'

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

const FORMAT_LABELS: Record<OutputFormat, string> = {
  jpg: 'JPG',
  png: 'PNG',
  webp: 'WebP',
}

const WATERMARK_POSITIONS: { value: WatermarkPosition; label: string }[] = [
  { value: 'bottom-right', label: '右下' },
  { value: 'center', label: '居中' },
  { value: 'bottom-left', label: '左下' },
  { value: 'tile', label: '平铺' },
]

// 文件信息接口
interface FileInfo {
  id: string
  file: File
  baseName: string
  convertedBlob: Blob | null
  convertedUrl: string | null
  status: 'pending' | 'converting' | 'completed' | 'error'
  error?: string
  originalWidth?: number
  originalHeight?: number
  outputWidth?: number
  outputHeight?: number
  reachedTargetSize?: boolean
}

interface ParsedDimension {
  value?: number
  invalid: boolean
}

/** 格式化文件体积 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 格式化压缩率，如 -65% */
function formatCompression(originalSize: number, outputSize: number): string {
  if (originalSize <= 0) return '—'
  const percent = (outputSize / originalSize - 1) * 100
  const rounded = Math.round(percent)
  if (rounded === 0) return '0%'
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

/** 解析宽高输入：留空或 0 表示不缩放 */
function parseDimension(raw: string): ParsedDimension {
  const trimmed = raw.trim()
  if (!trimmed) return { value: undefined, invalid: false }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) {
    return { value: undefined, invalid: true }
  }
  if (value === 0) return { value: undefined, invalid: false }
  return { value: Math.round(value), invalid: false }
}

/** 解析目标体积（KB），留空表示不限制 */
function parseTargetSize(raw: string): ParsedDimension {
  const trimmed = raw.trim()
  if (!trimmed) return { value: undefined, invalid: false }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value <= 0) {
    return { value: undefined, invalid: true }
  }
  return { value: Math.round(value), invalid: false }
}

/** 提取不含扩展名的文件名 */
function getBaseName(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  return lastDot > 0 ? fileName.substring(0, lastDot) : fileName
}

/** 释放 ObjectURL，并从记录集合中移除 */
function releaseObjectUrl(url: string | null | undefined, urls: Set<string>): void {
  if (!url) return
  URL.revokeObjectURL(url)
  urls.delete(url)
}

/** 生成不冲突的 ZIP 内文件名 */
function buildUniqueName(name: string, used: Set<string>): string {
  const key = name.toLowerCase()
  if (!used.has(key)) {
    used.add(key)
    return name
  }

  const lastDot = name.lastIndexOf('.')
  const base = lastDot > 0 ? name.substring(0, lastDot) : name
  const ext = lastDot > 0 ? name.substring(lastDot) : ''
  let index = 1
  let candidate = `${base} (${index})${ext}`

  while (used.has(candidate.toLowerCase())) {
    index += 1
    candidate = `${base} (${index})${ext}`
  }

  used.add(candidate.toLowerCase())
  return candidate
}

export default function ImageConverter() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpg')

  // 转换参数
  const [quality, setQuality] = useState(92)
  const [maxWidth, setMaxWidth] = useState('')
  const [maxHeight, setMaxHeight] = useState('')
  const [targetSize, setTargetSize] = useState('')

  // 水印参数
  const [watermarkText, setWatermarkText] = useState('')
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>('bottom-right')
  const [watermarkOpacity, setWatermarkOpacity] = useState(60)
  const [watermarkAutoFontSize, setWatermarkAutoFontSize] = useState(true)
  const [watermarkFontSize, setWatermarkFontSize] = useState(24)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 保持最新的文件列表，供卸载清理与自动重转使用
  const filesRef = useRef<FileInfo[]>([])
  const mountedRef = useRef(true)
  const activeJobsRef = useRef(0)
  const jobCounterRef = useRef(0)
  const fileTokensRef = useRef(new Map<string, number>())
  const idCounterRef = useRef(0)
  // 记录所有由本组件创建的 ObjectURL，确保卸载时全部释放
  const createdUrlsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    filesRef.current = files
  }, [files])

  // 解析后的参数
  const maxWidthParsed = useMemo(() => parseDimension(maxWidth), [maxWidth])
  const maxHeightParsed = useMemo(() => parseDimension(maxHeight), [maxHeight])
  const targetSizeParsed = useMemo(() => parseTargetSize(targetSize), [targetSize])

  const convertOptions = useMemo<ConvertOptions>(() => {
    const trimmedWatermark = watermarkText.trim()
    return {
      quality: quality / 100,
      maxWidth: maxWidthParsed.value,
      maxHeight: maxHeightParsed.value,
      targetSizeKB: outputFormat === 'png' ? undefined : targetSizeParsed.value,
      watermark: trimmedWatermark
        ? {
            text: trimmedWatermark,
            position: watermarkPosition,
            opacity: watermarkOpacity / 100,
            fontSize: watermarkAutoFontSize
              ? undefined
              : Math.round(Math.min(72, Math.max(12, watermarkFontSize))),
          }
        : undefined,
    }
  }, [
    quality,
    maxWidthParsed,
    maxHeightParsed,
    targetSizeParsed,
    outputFormat,
    watermarkText,
    watermarkPosition,
    watermarkOpacity,
    watermarkAutoFontSize,
    watermarkFontSize,
  ])

  // 参数校验提示
  const parameterIssues = useMemo(() => {
    const issues: string[] = []
    if (maxWidthParsed.invalid) {
      issues.push('最大宽度需为非负数字，已按“不缩放”处理')
    }
    if (maxHeightParsed.invalid) {
      issues.push('最大高度需为非负数字，已按“不缩放”处理')
    }
    if (targetSizeParsed.invalid) {
      issues.push('目标体积需为大于 0 的数字（KB），已忽略该设置')
    }
    if (!watermarkAutoFontSize && (watermarkFontSize < 12 || watermarkFontSize > 72)) {
      issues.push('水印字号需在 12–72px 之间，已自动修正')
    }
    return issues
  }, [
    maxWidthParsed.invalid,
    maxHeightParsed.invalid,
    targetSizeParsed.invalid,
    watermarkAutoFontSize,
    watermarkFontSize,
  ])

  // 单个文件转换
  const runOne = useCallback(
    async (fileInfo: FileInfo, options: ConvertOptions, format: OutputFormat) => {
      const token = (jobCounterRef.current += 1)
      fileTokensRef.current.set(fileInfo.id, token)
      activeJobsRef.current += 1
      setIsProcessing(true)

      // 清理该文件旧的 ObjectURL
      const previous = filesRef.current.find((f) => f.id === fileInfo.id)
      if (previous?.convertedUrl) {
        releaseObjectUrl(previous.convertedUrl, createdUrlsRef.current)
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileInfo.id
            ? {
                ...f,
                status: 'converting',
                convertedBlob: null,
                convertedUrl: null,
                error: undefined,
                reachedTargetSize: undefined,
              }
            : f
        )
      )

      try {
        const result = await convertImageWithInfo(fileInfo.file, format, options)

        // 已有更新的转换任务，丢弃旧结果
        if (fileTokensRef.current.get(fileInfo.id) !== token) return

        const convertedUrl = URL.createObjectURL(result.blob)
        createdUrlsRef.current.add(convertedUrl)
        if (!mountedRef.current) {
          releaseObjectUrl(convertedUrl, createdUrlsRef.current)
          return
        }

        setFiles((prev) => {
          // 文件已被移除
          if (!prev.some((f) => f.id === fileInfo.id)) {
            releaseObjectUrl(convertedUrl, createdUrlsRef.current)
            return prev
          }
          return prev.map((f) =>
            f.id === fileInfo.id
              ? {
                  ...f,
                  convertedBlob: result.blob,
                  convertedUrl,
                  status: 'completed',
                  error: undefined,
                  originalWidth: result.originalWidth,
                  originalHeight: result.originalHeight,
                  outputWidth: result.width,
                  outputHeight: result.height,
                  reachedTargetSize: result.reachedTargetSize,
                }
              : f
          )
        })
        fileTokensRef.current.delete(fileInfo.id)
      } catch (error) {
        if (fileTokensRef.current.get(fileInfo.id) !== token) return
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileInfo.id
              ? {
                  ...f,
                  status: 'error',
                  convertedBlob: null,
                  convertedUrl: null,
                  error: error instanceof Error ? error.message : '转换失败',
                }
              : f
          )
        )
        fileTokensRef.current.delete(fileInfo.id)
      } finally {
        activeJobsRef.current = Math.max(0, activeJobsRef.current - 1)
        if (mountedRef.current && activeJobsRef.current === 0) {
          setIsProcessing(false)
        }
      }
    },
    []
  )

  // 并发转换（限制并发数，避免大图同时处理占用过多内存）
  const runAll = useCallback(
    async (list: FileInfo[], options: ConvertOptions, format: OutputFormat) => {
      const queue = [...list]
      const workerCount = Math.min(3, queue.length)
      if (workerCount === 0) return

      await Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (queue.length > 0) {
            const item = queue.shift()
            if (item) {
              await runOne(item, options, format)
            }
          }
        })
      )
    },
    [runOne]
  )

  // 参数变化后自动重新转换所有已上传文件
  useEffect(() => {
    if (filesRef.current.length === 0) return

    const timer = setTimeout(() => {
      const list = filesRef.current
      if (list.length > 0) {
        void runAll(list, convertOptions, outputFormat)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [convertOptions, outputFormat, runAll])

  // 组件卸载：清理所有 ObjectURL
  useEffect(() => {
    const urls = createdUrlsRef.current
    return () => {
      mountedRef.current = false
      urls.forEach((url) => {
        URL.revokeObjectURL(url)
      })
      urls.clear()
    }
  }, [])

  // 处理文件选择
  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return

      const accepted: FileInfo[] = []
      const rejected: string[] = []

      Array.from(selectedFiles).forEach((file) => {
        const lowerName = file.name.toLowerCase()
        const isValidType =
          ACCEPTED_TYPES.includes(file.type) ||
          ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))

        if (!isValidType) {
          rejected.push(file.name)
          return
        }

        idCounterRef.current += 1
        accepted.push({
          id: `${Date.now()}-${idCounterRef.current}`,
          file,
          baseName: getBaseName(file.name),
          convertedBlob: null,
          convertedUrl: null,
          status: 'pending',
        })
      })

      if (rejected.length > 0) {
        alert(
          `以下文件不是支持的格式：\n${rejected.join('\n')}\n\n支持的格式：JPG、JFIF、WebP、PNG、GIF、BMP、TIFF、SVG、ICO`
        )
      }

      if (accepted.length > 0) {
        filesRef.current = [...filesRef.current, ...accepted]
        setFiles((prev) => [...prev, ...accepted])
        await runAll(accepted, convertOptions, outputFormat)
      }
    },
    [convertOptions, outputFormat, runAll]
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

  // 输出文件名（扩展名跟随当前格式）
  const getOutputName = useCallback(
    (fileInfo: FileInfo) => `${fileInfo.baseName}.${outputFormat}`,
    [outputFormat]
  )

  // 单个文件下载
  const handleDownload = useCallback(
    (fileInfo: FileInfo) => {
      if (!fileInfo.convertedBlob || !fileInfo.convertedUrl) return

      const link = document.createElement('a')
      link.href = fileInfo.convertedUrl
      link.download = getOutputName(fileInfo)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },
    [getOutputName]
  )

  // 批量打包下载
  const handleBatchDownload = useCallback(async () => {
    const completedFiles = files.filter((f) => f.status === 'completed' && f.convertedBlob)

    if (completedFiles.length === 0) {
      alert('没有可下载的文件')
      return
    }

    try {
      const zip = new JSZip()
      const usedNames = new Set<string>()

      completedFiles.forEach((fileInfo) => {
        if (fileInfo.convertedBlob) {
          zip.file(buildUniqueName(getOutputName(fileInfo), usedNames), fileInfo.convertedBlob)
        }
      })

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
  }, [files, getOutputName])

  // 移除文件
  const handleRemove = useCallback((fileInfo: FileInfo) => {
    fileTokensRef.current.delete(fileInfo.id)
    if (fileInfo.convertedUrl) {
      releaseObjectUrl(fileInfo.convertedUrl, createdUrlsRef.current)
    }
    filesRef.current = filesRef.current.filter((f) => f.id !== fileInfo.id)
    setFiles((prev) => prev.filter((f) => f.id !== fileInfo.id))
  }, [])

  // 清空所有文件
  const handleClear = useCallback(() => {
    fileTokensRef.current.clear()
    filesRef.current.forEach((fileInfo) => {
      if (fileInfo.convertedUrl) {
        releaseObjectUrl(fileInfo.convertedUrl, createdUrlsRef.current)
      }
    })
    // 兜底清理所有记录在案的 URL
    createdUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url)
    })
    createdUrlsRef.current.clear()
    filesRef.current = []
    setFiles([])
  }, [])

  // 汇总数据（基于已完成的文件）
  const summary = useMemo(() => {
    const completed = files.filter((f) => f.status === 'completed' && f.convertedBlob)
    const originalTotal = completed.reduce((sum, f) => sum + f.file.size, 0)
    const outputTotal = completed.reduce((sum, f) => sum + (f.convertedBlob?.size ?? 0), 0)
    return {
      completedCount: completed.length,
      originalTotal,
      outputTotal,
      compression: formatCompression(originalTotal, outputTotal),
    }
  }, [files])

  const hasLargeImage = files.some(
    (f) => (f.originalWidth ?? 0) > 4000 || (f.originalHeight ?? 0) > 4000
  )

  return (
    <div className="max-w-4xl mx-auto">
      {/* 转换参数面板 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-5 md:p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">转换参数</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            修改参数后会自动重新转换已上传的文件
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 输出格式与质量 */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              输出格式
            </label>
            <div className="flex gap-2">
              {(['jpg', 'png', 'webp'] as OutputFormat[]).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setOutputFormat(format)}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                    outputFormat === format
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {FORMAT_LABELS[format]}
                </button>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="quality-range" className="font-medium text-gray-700 dark:text-gray-300">
                  输出质量
                </label>
                <span className={outputFormat === 'png' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}>
                  {outputFormat === 'png' ? '无损' : `${quality}%`}
                </span>
              </div>
              <input
                id="quality-range"
                type="range"
                min={10}
                max={100}
                step={1}
                value={quality}
                disabled={outputFormat === 'png'}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="mt-2 w-full accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {outputFormat === 'png' ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  PNG 为无损格式，质量参数不可用
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  质量越低文件越小，建议 70%–92%
                </p>
              )}
            </div>
          </div>

          {/* 尺寸限制与目标体积 */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="max-width" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  最大宽度（px）
                </label>
                <input
                  id="max-width"
                  type="number"
                  min={0}
                  placeholder="0 或留空不缩放"
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="max-height" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  最大高度（px）
                </label>
                <input
                  id="max-height"
                  type="number"
                  min={0}
                  placeholder="0 或留空不缩放"
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              按最大宽高等比缩放，不会放大图片（超过原图尺寸时保持原尺寸）
            </p>

            <div>
              <label htmlFor="target-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                目标体积（KB，可选）
              </label>
              <input
                id="target-size"
                type="number"
                min={1}
                placeholder={outputFormat === 'png' ? 'PNG 不支持目标体积' : '例如 200'}
                value={targetSize}
                disabled={outputFormat === 'png'}
                onChange={(e) => setTargetSize(e.target.value)}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {outputFormat === 'png'
                  ? 'PNG 为无损格式，不支持目标体积压缩'
                  : '通过迭代降低质量逼近目标体积，最低质量 5%'}
              </p>
            </div>
          </div>

          {/* 水印 */}
          <div className="md:col-span-2 pt-1 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
              <label htmlFor="watermark-text" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                水印文字
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400">留空则不添加水印</span>
            </div>
            <input
              id="watermark-text"
              type="text"
              value={watermarkText}
              placeholder="例如：仅供内部使用"
              onChange={(e) => setWatermarkText(e.target.value)}
              className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  位置
                </label>
                <div className="flex flex-wrap gap-2">
                  {WATERMARK_POSITIONS.map((position) => (
                    <button
                      key={position.value}
                      type="button"
                      onClick={() => setWatermarkPosition(position.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        watermarkPosition === position.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {position.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <label htmlFor="watermark-opacity" className="font-medium text-gray-700 dark:text-gray-300">
                    不透明度
                  </label>
                  <span className="text-gray-700 dark:text-gray-200">{watermarkOpacity}%</span>
                </div>
                <input
                  id="watermark-opacity"
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <input
                    type="checkbox"
                    checked={watermarkAutoFontSize}
                    onChange={(e) => setWatermarkAutoFontSize(e.target.checked)}
                    className="accent-blue-600"
                  />
                  自动字号
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  按图片短边的 4% 计算（限制 12–72px）
                </p>
              </div>

              <div>
                <label htmlFor="watermark-font-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  字号（px）
                </label>
                <input
                  id="watermark-font-size"
                  type="number"
                  min={12}
                  max={72}
                  value={watermarkFontSize}
                  disabled={watermarkAutoFontSize}
                  onChange={(e) => setWatermarkFontSize(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {parameterIssues.length > 0 && (
          <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-700 dark:text-amber-300">
              {parameterIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          说明：Canvas 重新编码会移除 EXIF 等元数据（隐私更好）；证件照工具会写入 300 DPI。
        </p>
      </div>

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

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="mt-8 space-y-4">
          {/* 汇总信息 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">文件数</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {files.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                已完成 {summary.completedCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">原始总大小</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatSize(summary.originalTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">输出总大小</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatSize(summary.outputTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">总体压缩率</p>
              <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                {summary.completedCount > 0 ? summary.compression : '—'}
              </p>
            </div>
          </div>

          {/* 操作按钮栏 */}
          <div className="flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isProcessing
                ? '正在按当前参数转换，请稍候...'
                : `共 ${files.length} 个文件，${summary.completedCount} 个已转换完成`}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  void runAll(files, convertOptions, outputFormat)
                }}
                disabled={isProcessing || files.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                重新转换全部
              </button>
              {summary.completedCount > 0 && (
                <button
                  onClick={handleBatchDownload}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  打包下载 ({summary.completedCount})
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

          {hasLargeImage && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
              检测到超过 4000px 的大图，转换会占用较多内存；建议设置最大宽度/高度后再处理。
            </div>
          )}

          {/* 文件项列表 */}
          <div className="space-y-3">
            {files.map((fileInfo) => (
              <div
                key={fileInfo.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {fileInfo.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                      → {getOutputName(fileInfo)}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        原大小：{formatSize(fileInfo.file.size)}
                      </span>
                      {fileInfo.convertedBlob && (
                        <span>
                          输出：{formatSize(fileInfo.convertedBlob.size)}
                        </span>
                      )}
                      {fileInfo.convertedBlob && (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          压缩率 {formatCompression(fileInfo.file.size, fileInfo.convertedBlob.size)}
                        </span>
                      )}
                      {fileInfo.originalWidth && fileInfo.originalHeight && (
                        <span>
                          尺寸：{fileInfo.originalWidth}×{fileInfo.originalHeight}px
                        </span>
                      )}
                      {fileInfo.outputWidth &&
                        fileInfo.outputHeight &&
                        fileInfo.originalWidth &&
                        fileInfo.originalHeight &&
                        (fileInfo.outputWidth !== fileInfo.originalWidth ||
                          fileInfo.outputHeight !== fileInfo.originalHeight) && (
                          <span className="text-blue-600 dark:text-blue-400">
                            输出尺寸：{fileInfo.outputWidth}×{fileInfo.outputHeight}px
                          </span>
                        )}
                      <span>MIME：{fileInfo.file.type || '未知'}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
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
                      {fileInfo.status === 'completed' &&
                        outputFormat !== 'png' &&
                        targetSizeParsed.value !== undefined && (
                          <span
                            className={`text-xs ${
                              fileInfo.reachedTargetSize
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {fileInfo.reachedTargetSize
                              ? '已达到目标体积'
                              : '未达到目标体积（已使用最低质量）'}
                          </span>
                        )}
                      {(fileInfo.originalWidth ?? 0) > 4000 || (fileInfo.originalHeight ?? 0) > 4000 ? (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          大图，处理较慢
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
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
