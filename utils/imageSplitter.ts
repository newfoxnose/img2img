/**
 * 图片分割工具函数
 * 将横版照片分割成多张竖版照片，每张竖版照片宽高比为 3:4
 * 分割前会先对原图进行裁切，使分割结果为整数张
 */

import { type OutputFormat, FORMAT_CONFIGS } from './imageConverter'

// 目标竖版照片的宽高比（宽:高 = 3:4）
const TARGET_RATIO = 3 / 4

/**
 * 旋转方向选项
 * - 0: 不旋转
 * - 90: 右转 90°（顺时针）
 * - 270: 左转 90°（逆时针）
 */
export type RotationOption = 0 | 90 | 270

/**
 * 裁切方向选项
 * - auto: 自动（横版裁左右、竖版裁上下）
 * - leftright: 裁切左右两侧，保持完整高度，沿水平方向分割
 * - topbottom: 裁切上下两侧，保持完整宽度，沿垂直方向分割
 */
export type CropDirection = 'auto' | 'leftright' | 'topbottom'

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
  /** 分割前应用的旋转角度（0 / 90 / 270） */
  rotation: RotationOption
  /** 裁切方向 */
  cropDirection: CropDirection
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
 * 将图片按指定角度旋转并绘制到新的 Canvas 上
 * 仅支持 0° / 90°（顺时针右转）/ 270°（逆时针左转）
 */
function rotateImage(
  img: HTMLImageElement,
  rotation: RotationOption
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const W = img.width
  const H = img.height

  if (rotation === 0) {
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.drawImage(img, 0, 0)
    return canvas
  }

  // 旋转 90° 后宽高互换
  canvas.width = H
  canvas.height = W
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  if (rotation === 90) {
    // 顺时针旋转 90°（右转）
    ctx.translate(H, 0)
    ctx.rotate(Math.PI / 2)
  } else {
    // 逆时针旋转 90°（左转）
    ctx.translate(0, W)
    ctx.rotate(-Math.PI / 2)
  }
  ctx.drawImage(img, 0, 0)
  return canvas
}

/**
 * 将一张图片分割成多张 3:4 竖版图片
 *
 * 分割逻辑：
 * - 裁切左右（leftright）：保持原图高度不变，每张竖版高度 = 原图高度，
 *   每张宽度 = 原图高度 × (3/4)，沿水平方向分割，左右两侧均分裁切多余部分
 * - 裁切上下（topbottom）：保持原图宽度不变，每张竖版宽度 = 原图宽度，
 *   每张高度 = 原图宽度 × (4/3)，沿垂直方向分割，上下两侧均分裁切多余部分
 * - 自动（auto）：横版图片走裁切左右，竖版图片走裁切上下
 *
 * @param file 原始图片文件
 * @param outputFormat 输出格式（jpg、png、webp）
 * @param rotation 原图旋转方向：0 不旋转 / 90 右转 / 270 左转（旋转后再分割）
 * @param cropDirection 裁切方向：auto / leftright / topbottom
 * @returns Promise<{ blobs: Blob[]; info: SplitInfo }>
 */
export async function splitImageToPortraits(
  file: File,
  outputFormat: OutputFormat = 'jpg',
  rotation: RotationOption = 0,
  cropDirection: CropDirection = 'auto'
): Promise<{ blobs: Blob[]; info: SplitInfo }> {
  const img = await loadImage(file)

  // 先按指定方向旋转原图，再基于旋转后的画布进行分割
  const source = rotateImage(img, rotation)
  const W = source.width
  const H = source.height

  // 解析最终裁切方向：auto 模式下根据图片比例自动选择
  const finalDirection: 'leftright' | 'topbottom' =
    cropDirection === 'auto'
      ? W >= TARGET_RATIO * H
        ? 'leftright'
        : 'topbottom'
      : cropDirection

  let sliceCount: number
  let sliceWidth: number
  let sliceHeight: number
  let cropLeft: number
  let cropTop: number
  // 实际执行的裁切方向（所选方向放不下时会回退）
  let actualDirection: 'leftright' | 'topbottom' = finalDirection

  if (finalDirection === 'leftright') {
    // 裁切左右：保持高度，按宽度水平分割
    sliceHeight = H
    sliceWidth = TARGET_RATIO * H
    sliceCount = Math.floor(W / sliceWidth)
    if (sliceCount >= 1) {
      cropLeft = (W - sliceCount * sliceWidth) / 2
      cropTop = 0
    } else {
      // 宽度不足以容纳一张完整 3:4 切片，回退为裁切上下生成 1 张
      actualDirection = 'topbottom'
      sliceCount = 1
      sliceWidth = W
      sliceHeight = W / TARGET_RATIO
      cropLeft = 0
      cropTop = (H - sliceHeight) / 2
    }
  } else {
    // 裁切上下：保持宽度，按高度垂直分割
    sliceWidth = W
    sliceHeight = W / TARGET_RATIO // = W * 4 / 3
    sliceCount = Math.floor(H / sliceHeight)
    if (sliceCount >= 1) {
      cropLeft = 0
      cropTop = (H - sliceCount * sliceHeight) / 2
    } else {
      // 高度不足以容纳一张完整 3:4 切片，回退为裁切左右生成 1 张
      actualDirection = 'leftright'
      sliceCount = 1
      sliceHeight = H
      sliceWidth = TARGET_RATIO * H
      cropLeft = (W - sliceWidth) / 2
      cropTop = 0
    }
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

        // 根据实际裁切方向计算源图起始坐标
        const sx = actualDirection === 'leftright' ? cropLeft + i * sliceWidth : cropLeft
        const sy = actualDirection === 'topbottom' ? cropTop + i * sliceHeight : cropTop

        ctx.drawImage(
          source,
          sx, // 源图起始 x
          sy, // 源图起始 y
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
    cropBottom: H - cropTop - sliceCount * sliceHeight,
    originalWidth: W,
    originalHeight: H,
    rotation,
    cropDirection: actualDirection,
  }

  return { blobs, info }
}
