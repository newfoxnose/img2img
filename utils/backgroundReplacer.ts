/**
 * 背景替换工具函数（基于 @imgly/background-removal）
 * 模型与 wasm 运行时从本地 public/bg-removal/ 加载（由 scripts/copy-bg-removal-assets.js 拷贝）
 * 无需访问外部 CDN，可离线运行
 */

// 背景颜色配置
export type BackgroundColor = 'white' | 'red' | 'royal-blue' | 'sky-blue'

export interface BackgroundColorConfig {
  name: string
  hex: string
  rgb: [number, number, number]
}

// 背景颜色映射
export const BACKGROUND_COLORS: Record<BackgroundColor, BackgroundColorConfig> = {
  white: {
    name: '白色',
    hex: '#FFFFFF',
    rgb: [255, 255, 255],
  },
  red: {
    name: '红色',
    hex: '#DC143C',
    rgb: [220, 20, 60],
  },
  'royal-blue': {
    name: '宝蓝色',
    hex: '#4169E1',
    rgb: [65, 105, 225],
  },
  'sky-blue': {
    name: '天蓝色',
    hex: '#87CEEB',
    rgb: [135, 206, 235],
  },
}

// 缓存 removeBackground 函数引用（库本体通过动态 import 按需加载，保持首屏 bundle 体积）
let removeBackgroundFn:
  | typeof import('@imgly/background-removal').removeBackground
  | null = null

async function loadRemoveBackground() {
  if (removeBackgroundFn) {
    return removeBackgroundFn
  }
  const module = await import('@imgly/background-removal')
  removeBackgroundFn = module.removeBackground
  return removeBackgroundFn
}

// onnxruntime-web 以全局 window.ort 提供（webpack external），需先注入本地脚本
let ortScriptPromise: Promise<void> | null = null

function ensureOrtLoaded(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('仅客户端可用'))
  }
  if ((window as { ort?: unknown }).ort) {
    return Promise.resolve()
  }
  if (!ortScriptPromise) {
    ortScriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = '/ort/ort.min.js'
      script.onload = () => resolve()
      script.onerror = () => {
        ortScriptPromise = null
        reject(new Error('加载推理引擎失败'))
      }
      document.head.appendChild(script)
    })
  }
  return ortScriptPromise
}

/**
 * 将 Blob 加载为 HTMLImageElement
 */
async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}

/**
 * 替换图片背景
 * @param imageFile 原始图片文件
 * @param backgroundColor 背景颜色
 * @returns Promise<Blob> 处理后的图片 Blob
 */
export async function replaceBackground(
  imageFile: File,
  backgroundColor: BackgroundColor
): Promise<Blob> {
  try {
    // 确保只在客户端环境中运行
    if (typeof window === 'undefined') {
      throw new Error('背景替换功能仅在客户端可用')
    }

    const [removeBackground] = await Promise.all([
      loadRemoveBackground(),
      ensureOrtLoaded(),
    ])

    // 使用本地托管的模型资源进行抠图，得到透明背景 PNG
    // publicPath 必须是绝对 URL（库内部用 new URL(path, publicPath) 解析）
    const transparentBlob = await removeBackground(imageFile, {
      publicPath: `${window.location.origin}/bg-removal/`,
      model: 'isnet_quint8',
      output: {
        format: 'image/png',
      },
    })

    // 将抠图结果加载成图片
    const foregroundImage = await loadImageFromBlob(transparentBlob)

    // 创建画布并填充背景颜色
    const canvas = document.createElement('canvas')
    canvas.width = foregroundImage.width
    canvas.height = foregroundImage.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法创建 Canvas 上下文')
    }

    const bgColor = BACKGROUND_COLORS[backgroundColor]
    ctx.fillStyle = bgColor.hex
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 绘制前景（透明 PNG），自动保留 Alpha 通道
    ctx.drawImage(foregroundImage, 0, 0, canvas.width, canvas.height)

    // 导出 JPG（不含透明通道）
    const outputBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('生成图片失败'))
          }
        },
        'image/jpeg',
        0.95
      )
    })

    return outputBlob
  } catch (error) {
    // 保留原始堆栈，便于诊断引擎内部问题
    if (error instanceof Error) {
      console.error('[bg-removal] 原始错误堆栈: ' + error.stack)
    }
    throw new Error(
      error instanceof Error ? error.message : '背景替换失败'
    )
  }
}
