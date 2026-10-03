/**
 * 图片分割工具函数
 * 将横版照片分割成多张竖版照片，每张竖版照片宽高比为 3:4
 * 分割前会先对原图进行裁切，使分割结果为整数张
 */

import { type OutputFormat, FORMAT_CONFIGS } from './imageConverter'

// 目标竖版照片的宽高比（宽:高 = 3:4）
const TARGET_RATIO = 3 / 4

// 分割结果信息
export interface SplitInfo {
  /** 分割后每张竖版照片的宽度 */
  sliceWidth: number
  /** 分割后每张竖版照片的高度 */
  sliceHeight: number
  /** 分割得到的竖版照片数量 */
  sliceCount: number
  /** 原图左侧裁切像素数 */
  cropLeft: number
  /** 原图顶部裁切像素数 */
  cropTop: number
  /** 原图右侧裁切像素数 */
  cropRight: number
  /** 原图底部裁切像素数 */
  cropBottom: number
  /** 原图宽度 */
  originalWidth: number
  /** 原图高度 */
  originalHeight: number
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
 * 将一张横版图片分割成多张 3:4 竖版图片
 *
 * 分割逻辑：
 * - 保持原图高度不变，每张竖版照片高度 = 原图高度
 * - 每张竖版照片宽度 = 原图高度 × (3/4)
 * - 可分割的张数 = floor(原图宽度 / 每张宽度)
 * - 左右两侧均分裁切掉多余部分，使总宽度刚好等于 张数 × 每张宽度
 * - 若原图本身为竖版（宽度不足以容纳一张 3:4 照片），则只输出一张，
 *   此时改为裁切上下两侧以满足 3:4 比例
 *
 * @param file 原始图片文件
 * @param outputFormat 输出格式（jpg、png、webp）
 * @returns Promise<{ blobs: Blob[]; info: SplitInfo }>
 */
export async function splitImageToPortraits(
  file: File,
  outputFormat: OutputFormat = 'jpg'
): Promise<{ blobs: Blob[]; info: SplitInfo }> {
  const img = await loadImage(file)

  const W = img.width
  const H = img.height

  let sliceCount: number
  let sliceWidth: number
  let sliceHeight: number
  let cropLeft: number
  let cropTop: number

  if (W >= TARGET_RATIO * H) {
    // 横版或足够宽的图片：保持高度，按宽度分割
    sliceHeight = H
    sliceWidth = TARGET_RATIO * H
    sliceCount = Math.floor(W / sliceWidth)
    if (sliceCount < 1) sliceCount = 1
    // 左右两侧均分裁切
    cropLeft = (W - sliceCount * sliceWidth) / 2
    cropTop = 0
  } else {
    // 竖版图片：只输出一张，裁切上下两侧以满足 3:4
    sliceCount = 1
    sliceWidth = W
    sliceHeight = W / TARGET_RATIO // = W * 4 / 3
    cropLeft = 0
    cropTop = (H - sliceHeight) / 2
  }

  const config = FORMAT_CONFIGS[outputFormat]

  // 逐张绘制并转为 Blob，使用 Promise.all 保证顺序
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

        // JPG / WebP 不支持透明，填充白色背景
        if (outputFormat !== 'png') {
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        ctx.drawImage(
          img,
          cropLeft + i * sliceWidth, // 源图起始 x
          cropTop, // 源图起始 y
          sliceWidth, // 源图宽度
          sliceHeight, // 源图高度
          0, // 目标 x
          0, // 目标 y
          sliceWidth, // 目标宽度
          sliceHeight // 目标高度
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

  const blobs = await Promise.all(slicePromises)

  const info: SplitInfo = {
    sliceWidth,
    sliceHeight,
    sliceCount,
    cropLeft,
    cropTop,
    cropRight: W - cropLeft - sliceCount * sliceWidth,
    cropBottom: H - cropTop - sliceHeight,
    originalWidth: W,
    originalHeight: H,
  }

  return { blobs, info }
}
