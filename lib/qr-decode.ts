import jsQR from 'jsqr'

/**
 * 二维码识别增强模块
 * 针对美化二维码（彩色、圆点、渐变、带 Logo / 文字遮挡）依次尝试多种预处理与解码器：
 * 1. jsQR 直接解码（含反色）
 * 2. 灰度 + 对比度拉伸
 * 3. Otsu 全局二值化
 * 4. 局部自适应二值化（抗渐变背景）
 * 5. ZXing（TRY_HARDER）作为兜底，支持反色与两种二值化策略
 */

export interface QrDecodeAttempt {
  name: string
  ok: boolean
}

export interface QrDecodeOutcome {
  data: string
  /** 最终成功的方式，便于界面提示 */
  method: string
  attempts: QrDecodeAttempt[]
}

const MAX_SIDE = 1600
const MIN_SIDE = 480

function drawImageToImageData(image: HTMLImageElement): ImageData {
  const naturalWidth = image.naturalWidth || image.width
  const naturalHeight = image.naturalHeight || image.height
  if (!naturalWidth || !naturalHeight) throw new Error('图片尺寸无效')

  let scale = Math.min(1, MAX_SIDE / Math.max(naturalWidth, naturalHeight))
  if (Math.min(naturalWidth, naturalHeight) < MIN_SIDE) {
    scale = Math.min(3, MIN_SIDE / Math.min(naturalWidth, naturalHeight))
  }

  const width = Math.max(1, Math.round(naturalWidth * scale))
  const height = Math.max(1, Math.round(naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('无法创建画布')

  context.imageSmoothingEnabled = true
  context.drawImage(image, 0, 0, width, height)
  return context.getImageData(0, 0, width, height)
}

function toGray(imageData: ImageData): Uint8ClampedArray {
  const { data } = imageData
  const gray = new Uint8ClampedArray(imageData.width * imageData.height)
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114
  }
  return gray
}

function grayToRgba(gray: Uint8ClampedArray): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(gray.length * 4)
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const value = gray[i]
    rgba[p] = value
    rgba[p + 1] = value
    rgba[p + 2] = value
    rgba[p + 3] = 255
  }
  return rgba
}

/** 按 2% / 98% 分位拉伸对比度，缓解低对比度配色 */
function stretchContrast(gray: Uint8ClampedArray): Uint8ClampedArray {
  const histogram = new Uint32Array(256)
  for (let i = 0; i < gray.length; i++) histogram[gray[i]]++

  const total = gray.length
  const lowTarget = total * 0.02
  const highTarget = total * 0.98

  let low = 0
  let high = 255
  let acc = 0
  for (let v = 0; v < 256; v++) {
    acc += histogram[v]
    if (acc >= lowTarget) {
      low = v
      break
    }
  }
  acc = 0
  for (let v = 0; v < 256; v++) {
    acc += histogram[v]
    if (acc >= highTarget) {
      high = v
      break
    }
  }

  if (high <= low) return gray

  const scale = 255 / (high - low)
  const out = new Uint8ClampedArray(gray.length)
  for (let i = 0; i < gray.length; i++) {
    out[i] = (gray[i] - low) * scale
  }
  return out
}

/** Otsu 全局阈值 */
function otsuThreshold(gray: Uint8ClampedArray): number {
  const histogram = new Uint32Array(256)
  for (let i = 0; i < gray.length; i++) histogram[gray[i]]++

  const total = gray.length
  let sum = 0
  for (let v = 0; v < 256; v++) sum += v * histogram[v]

  let sumBackground = 0
  let weightBackground = 0
  let maxVariance = -1
  let threshold = 127

  for (let v = 0; v < 256; v++) {
    weightBackground += histogram[v]
    if (weightBackground === 0) continue

    const weightForeground = total - weightBackground
    if (weightForeground === 0) break

    sumBackground += v * histogram[v]
    const meanBackground = sumBackground / weightBackground
    const meanForeground = (sum - sumBackground) / weightForeground
    const variance =
      weightBackground * weightForeground * (meanBackground - meanForeground) ** 2

    if (variance > maxVariance) {
      maxVariance = variance
      threshold = v
    }
  }

  return threshold
}

function binarizeGlobal(gray: Uint8ClampedArray, threshold: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length)
  for (let i = 0; i < gray.length; i++) {
    out[i] = gray[i] <= threshold ? 0 : 255
  }
  return out
}

/** 局部自适应阈值（积分图均值法），适合渐变背景与彩色模块 */
function binarizeAdaptive(
  gray: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const integral = new Float64Array((width + 1) * (height + 1))
  for (let y = 0; y < height; y++) {
    let rowSum = 0
    for (let x = 0; x < width; x++) {
      rowSum += gray[y * width + x]
      integral[(y + 1) * (width + 1) + (x + 1)] =
        integral[y * (width + 1) + (x + 1)] + rowSum
    }
  }

  let windowSize = Math.round(Math.min(width, height) / 24)
  if (windowSize % 2 === 0) windowSize++
  windowSize = Math.max(15, Math.min(61, windowSize))
  const radius = (windowSize - 1) / 2

  const out = new Uint8ClampedArray(gray.length)
  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - radius)
    const y2 = Math.min(height - 1, y + radius)
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - radius)
      const x2 = Math.min(width - 1, x + radius)
      const area = (x2 - x1 + 1) * (y2 - y1 + 1)
      const sum =
        integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
        integral[y1 * (width + 1) + (x2 + 1)] -
        integral[(y2 + 1) * (width + 1) + x1] +
        integral[y1 * (width + 1) + x1]
      const mean = sum / area
      out[y * width + x] = gray[y * width + x] < mean - 10 ? 0 : 255
    }
  }
  return out
}

function runJsQr(
  data: Uint8ClampedArray,
  width: number,
  height: number
): string | null {
  try {
    const code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })
    return code?.data ? code.data : null
  } catch {
    return null
  }
}

type ZxingModule = typeof import('@zxing/library')

let zxingPromise: Promise<ZxingModule> | null = null

function loadZxing(): Promise<ZxingModule> {
  if (!zxingPromise) {
    zxingPromise = import('@zxing/library')
  }
  return zxingPromise
}

/** ZXing 解码：Hybrid / GlobalHistogram 两种二值化 × 正反色 */
async function runZxing(
  gray: Uint8ClampedArray,
  width: number,
  height: number
): Promise<string | null> {
  const zx = await loadZxing()

  const hints = new Map<unknown, unknown>()
  hints.set(zx.DecodeHintType.POSSIBLE_FORMATS, [zx.BarcodeFormat.QR_CODE])
  hints.set(zx.DecodeHintType.TRY_HARDER, true)
  hints.set(zx.DecodeHintType.CHARACTER_SET, 'UTF-8')

  const reader = new zx.MultiFormatReader()
  reader.setHints(hints as Map<number, unknown>)

  const source = new zx.RGBLuminanceSource(gray, width, height)
  const sources = [source, source.invert()]

  for (const current of sources) {
    for (const Binarizer of [zx.HybridBinarizer, zx.GlobalHistogramBinarizer]) {
      try {
        const bitmap = new zx.BinaryBitmap(new Binarizer(current))
        const result = reader.decode(bitmap)
        const text = result?.getText()
        if (text) {
          reader.reset()
          return text
        }
      } catch {
        // 继续尝试下一种组合
      }
    }
  }

  reader.reset()
  return null
}

/**
 * 识别二维码图片，内部会依次尝试多种增强方式
 */
export async function decodeQrFromImage(
  image: HTMLImageElement
): Promise<QrDecodeOutcome> {
  const attempts: QrDecodeAttempt[] = []
  const imageData = drawImageToImageData(image)
  const { width, height } = imageData
  const baseGray = toGray(imageData)

  const succeed = (data: string, name: string): QrDecodeOutcome => {
    attempts.push({ name, ok: true })
    return { data, method: name, attempts }
  }

  const fail = (name: string) => {
    attempts.push({ name, ok: false })
  }

  // 1. 原图直接解码
  const direct = runJsQr(imageData.data, width, height)
  if (direct) return succeed(direct, '原图识别')
  fail('原图识别')

  // 2. 对比度拉伸
  const stretched = stretchContrast(baseGray)
  const stretchedRgba = grayToRgba(stretched)
  const stretchedResult = runJsQr(stretchedRgba, width, height)
  if (stretchedResult) return succeed(stretchedResult, '对比度增强')
  fail('对比度增强')

  // 3. Otsu 全局二值化
  const otsu = binarizeGlobal(stretched, otsuThreshold(stretched))
  const otsuRgba = grayToRgba(otsu)
  const otsuResult = runJsQr(otsuRgba, width, height)
  if (otsuResult) return succeed(otsuResult, '全局二值化')
  fail('全局二值化')

  // 4. 局部自适应二值化
  const adaptive = binarizeAdaptive(stretched, width, height)
  const adaptiveRgba = grayToRgba(adaptive)
  const adaptiveResult = runJsQr(adaptiveRgba, width, height)
  if (adaptiveResult) return succeed(adaptiveResult, '自适应二值化')
  fail('自适应二值化')

  // 5. ZXing 兜底（原图灰度）
  const zxingResult = await runZxing(stretched, width, height)
  if (zxingResult) return succeed(zxingResult, 'ZXing 深度识别')
  fail('ZXing 深度识别')

  // 6. ZXing 在自适应二值化图上再试一次
  const zxingBinaryResult = await runZxing(adaptive, width, height)
  if (zxingBinaryResult) return succeed(zxingBinaryResult, 'ZXing 二值化识别')
  fail('ZXing 二值化识别')

  return {
    data: '',
    method: '',
    attempts,
  }
}
