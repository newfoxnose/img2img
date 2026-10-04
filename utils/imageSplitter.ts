/**
 * 图片分割工具函数
 * 将横版照片分割成多张竖版照片，每张竖版照片宽高比为 3:4
 * 固定分割方向：裁切左右两侧，沿水平方向分割
 * 分割前可对原图进行任意角度旋转，并可指定裁切区域
 */

import { type OutputFormat, FORMAT_CONFIGS } from './imageConverter'

// 目标竖版照片的宽高比（宽:高 = 3:4）
const TARGET_RATIO = 3 / 4

/**
 * 裁切区域（基于旋转后画布的像素坐标）
 */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

// 分割结果信息
export interface SplitInfo {
  /** 分割后每张竖版照片的宽度 */
  sliceWidth: number
  /** 分割后每张竖版照片的高度 */
  sliceHeight: number
  /** 分割得到的竖版照片数量 */
  sliceCount: number
  /** 左侧裁切像素数（左右均分） */
  cropLeft: number
  /** 顶部裁切像素数 */
  cropTop: number
  /** 右侧裁切像素数 */
  cropRight: number
  /** 底部裁切像素数 */
  cropBottom: number
  /** 参与分割的源图宽度 */
  sourceWidth: number
  /** 参与分割的源图高度 */
  sourceHeight: number
  /** 原图宽度 */
  originalWidth: number
  /** 原图高度 */
  originalHeight: number
  /** 分割前应用的旋转角度（度） */
  rotation: number
}

/**
 * 将图片加载为 Image 对象
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const result = e.target?.result
      if (!result) {
        reject(new Error('文件读取失败'))
        return
      }

      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('图片加载失败，请确保文件是有效的图片格式'))

      if (typeof result === 'string') {
        img.src = result
      } else {
        const blob = new Blob([result])
        img.src = URL.createObjectURL(blob)
      }
    }

    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

/**
 * 计算图片旋转任意角度后的画布尺寸
 */
export function getRotatedDimensions(
  width: number,
  height: number,
  angleDeg: number
): { width: number; height: number } {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  return {
    width: Math.round(width * cos + height * sin),
    height: Math.round(width * sin + height * cos),
  }
}

/**
 * 将图片按任意角度旋转并绘制到新的 Canvas 上
 * 角度单位为度，正数顺时针旋转
 */
export function rotateImage(
  img: HTMLImageElement,
  angleDeg: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const W = img.width
  const H = img.height

  const normalized = ((angleDeg % 360) + 360) % 360
  if (normalized === 0) {
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.drawImage(img, 0, 0)
    return canvas
  }

  const { width: rotW, height: rotH } = getRotatedDimensions(W, H, angleDeg)
  canvas.width = rotW
  canvas.height = rotH
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const rad = (angleDeg * Math.PI) / 180
  ctx.translate(rotW / 2, rotH / 2)
  ctx.rotate(rad)
  ctx.drawImage(img, -W / 2, -H / 2)
  return canvas
}

/**
 * 将一个 Canvas（或其指定裁切区域）分割成多张 3:4 竖版图片
 * 固定方向：裁切左右两侧，沿水平方向分割
 */
function splitSourceToPortraits(
  source: HTMLCanvasElement,
  cropRect: CropRect | null,
  outputFormat: OutputFormat,
  originalWidth: number,
  originalHeight: number,
  rotation: number
): Promise<{ blobs: Blob[]; info: SplitInfo }> {
  // 若指定了裁切区域，先裁切到工作画布
  let workCanvas = source
  if (cropRect) {
    workCanvas = document.createElement('canvas')
    workCanvas.width = Math.max(1, Math.round(cropRect.width))
    workCanvas.height = Math.max(1, Math.round(cropRect.height))
    const ctx = workCanvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(
        source,
        cropRect.x,
        cropRect.y,
        cropRect.width,
        cropRect.height,
        0,
        0,
        workCanvas.width,
        workCanvas.height
      )
    }
  }

  const W = workCanvas.width
  const H = workCanvas.height

  // 固定裁切左右：保持高度不变，每张竖版高度 = 工作图高度，宽度 = 高度 × 3/4
  let sliceHeight = H
  let sliceWidth = TARGET_RATIO * H
  let sliceCount = Math.floor(W / sliceWidth)
  let cropLeft: number
  let cropTop: number

  if (sliceCount >= 1) {
    // 横版：裁切左右，沿水平方向分割为整数张
    cropLeft = (W - sliceCount * sliceWidth) / 2
    cropTop = 0
  } else {
    // 竖版（宽度不足一张 3:4）：回退为裁切上下，输出 1 张 3:4 竖版照片
    sliceCount = 1
    sliceWidth = W
    sliceHeight = W / TARGET_RATIO // = W × 4/3
    cropLeft = 0
    cropTop = (H - sliceHeight) / 2
  }

  const config = FORMAT_CONFIGS[outputFormat]

  const slicePromises: Promise<Blob>[] = []

  for (let i = 0; i < sliceCount; i++) {
    slicePromises.push(
      new Promise<Blob>((resolve, reject) => {
        const canvas = document.createElement('canvas')
        canvas.width = sliceWidth
        canvas.height = sliceHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'))
          return
        }

        if (outputFormat !== 'png') {
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        const sx = cropLeft + i * sliceWidth
        const sy = cropTop

        ctx.drawImage(
          workCanvas,
          sx,
          sy,
          sliceWidth,
          sliceHeight,
          0,
          0,
          sliceWidth,
          sliceHeight
        )

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('图片分割失败'))
            }
          },
          config.mimeType,
          config.quality
        )
      })
    )
  }

  return Promise.all(slicePromises).then((blobs) => {
    const info: SplitInfo = {
      sliceWidth,
      sliceHeight,
      sliceCount,
      cropLeft,
      cropTop,
      cropRight: W - cropLeft - sliceCount * sliceWidth,
      cropBottom: H - cropTop - sliceCount * sliceHeight,
      sourceWidth: W,
      sourceHeight: H,
      originalWidth,
      originalHeight,
      rotation,
    }
    return { blobs, info }
  })
}

/**
 * 将一张图片分割成多张 3:4 竖版图片
 *
 * 固定分割逻辑：裁切左右两侧，沿水平方向分割
 * - 保持原图（旋转后）高度不变
 * - 每张竖版高度 = 源图高度，宽度 = 源图高度 × (3/4)
 * - 左右两侧均分裁切多余部分以得到整数张
 *
 * @param file 原始图片文件
 * @param outputFormat 输出格式（jpg、png、webp）
 * @param rotation 原图旋转角度（度，正数顺时针）
 * @param cropRect 可选裁切区域（基于旋转后画布坐标），不传则使用整张旋转后的图
 * @returns Promise<{ blobs: Blob[]; info: SplitInfo }>
 */
export async function splitImageToPortraits(
  file: File,
  outputFormat: OutputFormat = 'jpg',
  rotation: number = 0,
  cropRect: CropRect | null = null
): Promise<{ blobs: Blob[]; info: SplitInfo }> {
  const img = await loadImage(file)
  const originalWidth = img.width
  const originalHeight = img.height

  const source = rotateImage(img, rotation)

  return splitSourceToPortraits(
    source,
    cropRect,
    outputFormat,
    originalWidth,
    originalHeight,
    rotation
  )
}
