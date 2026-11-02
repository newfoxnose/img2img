/**
 * 图片格式转换工具函数
 * 支持多种图片格式之间的转换、质量/尺寸压缩，以及水印绘制
 */

// 支持的输出格式类型
export type OutputFormat = 'jpg' | 'png' | 'webp'

// 输出格式配置
export interface FormatConfig {
  mimeType: string
  quality?: number // 质量参数（0-1），仅适用于有损格式
}

// 输出格式映射
export const FORMAT_CONFIGS: Record<OutputFormat, FormatConfig> = {
  jpg: {
    mimeType: 'image/jpeg',
    quality: 0.92, // JPG 默认质量
  },
  png: {
    mimeType: 'image/png',
    // PNG 是无损格式，不需要质量参数
  },
  webp: {
    mimeType: 'image/webp',
    quality: 0.92, // WebP 默认质量
  },
}

// 水印位置
export type WatermarkPosition = 'bottom-right' | 'center' | 'bottom-left' | 'tile'

// 水印配置
export interface WatermarkOptions {
  /** 水印文字，留空则不绘制 */
  text: string
  /** 水印位置，默认右下角 */
  position?: WatermarkPosition
  /** 不透明度（0.1-1），默认 0.6 */
  opacity?: number
  /** 字号（px），0 或省略时按图片短边比例自动计算 */
  fontSize?: number
}

// 转换参数
export interface ConvertOptions {
  /** 输出质量（0.05-1），仅 JPG / WebP 生效 */
  quality?: number
  /** 最大宽度（px），0 或省略表示不缩放 */
  maxWidth?: number
  /** 最大高度（px），0 或省略表示不缩放 */
  maxHeight?: number
  /** 水印配置 */
  watermark?: WatermarkOptions
  /** 目标体积（KB），仅 JPG / WebP 生效 */
  targetSizeKB?: number
}

// 转换结果（含尺寸与目标体积达成情况）
export interface ConvertResult {
  blob: Blob
  /** 原图宽度 */
  originalWidth: number
  /** 原图高度 */
  originalHeight: number
  /** 输出宽度 */
  width: number
  /** 输出高度 */
  height: number
  /** 实际使用的质量 */
  quality: number
  /** 是否达到目标体积（未设置目标体积时恒为 true） */
  reachedTargetSize: boolean
}

// 目标体积压缩结果
export interface TargetSizeResult {
  blob: Blob
  quality: number
  reachedTarget: boolean
}

const DEFAULT_QUALITY = 0.92
const MIN_QUALITY = 0.05
// 主流浏览器 Canvas 单边上限约为 16384，超过后 toBlob 可能失败
const MAX_CANVAS_DIMENSION = 16384
// 超过该尺寸时提示用户注意内存占用
export const LARGE_IMAGE_DIMENSION = 4000

/** 加载后的图片源 */
interface LoadedImage {
  source: CanvasImageSource
  width: number
  height: number
  dispose: () => void
}

/**
 * 将数值限制在指定区间内
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * 规范化质量参数，非法值回退为格式默认质量
 */
function normalizeQuality(quality: number | undefined, format: OutputFormat): number {
  if (quality === undefined || !Number.isFinite(quality)) {
    return FORMAT_CONFIGS[format].quality ?? DEFAULT_QUALITY
  }
  return clamp(quality, MIN_QUALITY, 1)
}

/**
 * 是否使用 HTMLImageElement 加载（SVG / GIF 保持原有加载方式）
 */
function shouldUseImageElement(file: File): boolean {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  return (
    type === 'image/svg+xml' ||
    type === 'image/gif' ||
    name.endsWith('.svg') ||
    name.endsWith('.gif')
  )
}

/**
 * 通过 FileReader + Image 加载图片（兜底方案）
 */
function loadWithImageElement(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const result = e.target?.result
      if (!result) {
        reject(new Error('文件读取失败'))
        return
      }

      const img = new Image()

      img.onload = () => {
        resolve({
          source: img,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          dispose: () => {
            img.src = ''
          },
        })
      }

      img.onerror = () => {
        reject(new Error('图片加载失败，请确保文件是有效的图片格式'))
      }

      if (typeof result === 'string') {
        img.src = result
      } else {
        const blob = new Blob([result])
        img.src = URL.createObjectURL(blob)
      }
    }

    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * 加载图片：优先 createImageBitmap，失败或 SVG / GIF 时回退到 Image
 */
async function loadImageSource(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function' && !shouldUseImageElement(file)) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      }
    } catch {
      // 某些格式（如 BMP / TIFF / ICO）createImageBitmap 可能失败，回退到 Image
    }
  }

  return loadWithImageElement(file)
}

/**
 * 计算等比缩放后的输出尺寸（不放大）
 */
function computeTargetSize(
  width: number,
  height: number,
  maxWidth?: number,
  maxHeight?: number
): { width: number; height: number } {
  let scale = 1

  if (maxWidth && maxWidth > 0) {
    scale = Math.min(scale, maxWidth / width)
  }
  if (maxHeight && maxHeight > 0) {
    scale = Math.min(scale, maxHeight / height)
  }

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Canvas 转 Blob，确保返回非空
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('图片编码失败，请尝试其他格式或缩小图片尺寸'))
          }
        },
        mimeType,
        quality
      )
    } catch (error) {
      reject(error instanceof Error ? error : new Error('图片编码失败'))
    }
  })
}

/**
 * 通过二分查找降低质量，逼近目标体积
 * @param canvas 已绘制完成的画布
 * @param mimeType 输出 MIME（有损格式）
 * @param targetSizeKB 目标体积（KB）
 * @param initialQuality 初始（较高质量）
 */
export async function compressToTargetSize(
  canvas: HTMLCanvasElement,
  mimeType: string,
  targetSizeKB: number,
  initialQuality: number = DEFAULT_QUALITY
): Promise<TargetSizeResult> {
  if (!Number.isFinite(targetSizeKB) || targetSizeKB <= 0) {
    const blob = await canvasToBlob(canvas, mimeType, clamp(initialQuality, MIN_QUALITY, 1))
    return { blob, quality: clamp(initialQuality, MIN_QUALITY, 1), reachedTarget: true }
  }

  const targetBytes = targetSizeKB * 1024
  const highQuality = clamp(initialQuality, MIN_QUALITY, 1)

  // 先尝试较高质量
  const firstBlob = await canvasToBlob(canvas, mimeType, highQuality)
  if (firstBlob.size <= targetBytes) {
    return { blob: firstBlob, quality: highQuality, reachedTarget: true }
  }

  let low = MIN_QUALITY
  let high = highQuality
  let bestBlob = await canvasToBlob(canvas, mimeType, MIN_QUALITY)
  let bestQuality = MIN_QUALITY

  // 二分逼近：保留体积达标的最大质量
  for (let i = 0; i < 8 && high - low > 0.02; i++) {
    const mid = (low + high) / 2
    const blob = await canvasToBlob(canvas, mimeType, mid)

    if (blob.size <= targetBytes) {
      low = mid
      bestBlob = blob
      bestQuality = mid
    } else {
      high = mid
    }
  }

  return {
    blob: bestBlob,
    quality: bestQuality,
    reachedTarget: bestBlob.size <= targetBytes,
  }
}

/**
 * 在画布上绘制水印
 */
function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: WatermarkOptions
): void {
  const text = options.text?.trim()
  if (!text) return

  const opacity = clamp(options.opacity ?? 0.6, 0.1, 1)
  const shortSide = Math.min(width, height)
  const autoFontSize = !options.fontSize || !Number.isFinite(options.fontSize) || options.fontSize <= 0
  const fontSize = autoFontSize
    ? clamp(Math.round(shortSide * 0.04), 12, 72)
    : clamp(Math.round(options.fontSize as number), 12, 72)

  const padding = Math.max(8, Math.round(fontSize * 0.7))
  const position: WatermarkPosition = options.position ?? 'bottom-right'

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.font = `600 ${fontSize}px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Helvetica Neue", Arial, sans-serif`
  ctx.fillStyle = '#FFFFFF'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.lineWidth = Math.max(1, fontSize / 6)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
  ctx.shadowBlur = Math.max(2, fontSize / 4)

  const drawAt = (x: number, y: number) => {
    ctx.strokeText(text, x, y)
    ctx.fillText(text, x, y)
  }

  if (position === 'tile') {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.translate(width / 2, height / 2)
    ctx.rotate(-Math.PI / 6)

    const textWidth = ctx.measureText(text).width
    const stepX = Math.max(textWidth + fontSize * 3, fontSize * 6)
    const stepY = Math.max(fontSize * 3, 32)
    const range = Math.hypot(width, height)

    for (let y = -range; y <= range; y += stepY) {
      for (let x = -range; x <= range; x += stepX) {
        drawAt(x, y)
      }
    }
  } else {
    if (position === 'center') {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      drawAt(width / 2, height / 2)
    } else if (position === 'bottom-left') {
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      drawAt(padding, height - padding)
    } else {
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      drawAt(width - padding, height - padding)
    }
  }

  ctx.restore()
}

/**
 * 将图片文件转换为指定格式，并返回尺寸、质量等详细信息
 * @param file 原始图片文件
 * @param outputFormat 目标输出格式（jpg、png、webp）
 * @param options 转换参数（质量、尺寸限制、水印、目标体积）
 */
export async function convertImageWithInfo(
  file: File,
  outputFormat: OutputFormat = 'jpg',
  options: ConvertOptions = {}
): Promise<ConvertResult> {
  const config = FORMAT_CONFIGS[outputFormat]
  if (!config) {
    throw new Error(`不支持的目标格式：${outputFormat}`)
  }

  const image = await loadImageSource(file)

  try {
    if (image.width <= 0 || image.height <= 0) {
      throw new Error('无法读取图片尺寸，请确保文件是有效的图片')
    }

    const target = computeTargetSize(image.width, image.height, options.maxWidth, options.maxHeight)

    if (target.width > MAX_CANVAS_DIMENSION || target.height > MAX_CANVAS_DIMENSION) {
      throw new Error(
        `图片尺寸过大（${target.width}×${target.height}px），请设置最大宽度/高度后再转换`
      )
    }

    const canvas = document.createElement('canvas')
    canvas.width = target.width
    canvas.height = target.height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法创建 Canvas 上下文')
    }

    // JPG 不支持透明度，透明区域填充白底；PNG / WebP 保留透明
    if (outputFormat === 'jpg') {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else if (outputFormat === 'png') {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image.source, 0, 0, canvas.width, canvas.height)

    if (options.watermark?.text?.trim()) {
      drawWatermark(ctx, canvas.width, canvas.height, options.watermark)
    }

    const quality = normalizeQuality(options.quality, outputFormat)
    let blob: Blob
    let reachedTargetSize = true
    let usedQuality = quality

    if (outputFormat === 'png') {
      // PNG 为无损格式，忽略质量与目标体积参数
      blob = await canvasToBlob(canvas, config.mimeType)
      usedQuality = 1
    } else if (
      options.targetSizeKB !== undefined &&
      Number.isFinite(options.targetSizeKB) &&
      options.targetSizeKB > 0
    ) {
      const result = await compressToTargetSize(
        canvas,
        config.mimeType,
        options.targetSizeKB,
        quality
      )
      blob = result.blob
      usedQuality = result.quality
      reachedTargetSize = result.reachedTarget
    } else {
      blob = await canvasToBlob(canvas, config.mimeType, quality)
    }

    return {
      blob,
      originalWidth: image.width,
      originalHeight: image.height,
      width: canvas.width,
      height: canvas.height,
      quality: usedQuality,
      reachedTargetSize,
    }
  } finally {
    image.dispose()
  }
}

/**
 * 将图片文件转换为指定格式
 * @param file 原始图片文件
 * @param outputFormat 目标输出格式（jpg、png、webp）
 * @returns Promise<Blob> 转换后的图片 Blob
 */
export async function convertImage(
  file: File,
  outputFormat: OutputFormat = 'jpg'
): Promise<Blob> {
  const { blob } = await convertImageWithInfo(file, outputFormat)
  return blob
}

/**
 * 将图片文件转换为 JPG 格式（向后兼容）
 * @param file 原始图片文件
 * @returns Promise<Blob> 转换后的 JPG 图片 Blob
 */
export async function convertImageToJPG(file: File): Promise<Blob> {
  return convertImage(file, 'jpg')
}
