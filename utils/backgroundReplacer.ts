/**
 * 背景替换工具函数（基于 @imgly/background-removal）
 * 使用 CDN 方式加载，避免模块打包问题
 */

// 全局变量，用于缓存已加载的模块
let backgroundRemovalModule: any = null
let isLoading = false
let loadPromise: Promise<any> | null = null

/**
 * 从 CDN 加载 @imgly/background-removal
 * 使用动态 import() 加载 ES 模块版本
 */
async function loadBackgroundRemoval(): Promise<any> {
  if (backgroundRemovalModule) {
    return backgroundRemovalModule
  }

  if (isLoading && loadPromise) {
    return loadPromise
  }

  isLoading = true
  loadPromise = (async () => {
    try {
      // 使用 jsDelivr CDN 加载 ES 模块版本
      // jsDelivr 支持直接加载 npm 包的 ES 模块
      // 使用 webpackIgnore 避免打包阶段尝试处理远程模块
      // @ts-ignore - 动态 import() URL 在运行时解析
      const module = await import(
        /* webpackIgnore: true */ ('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm' as any)
      )
      backgroundRemovalModule = module
      isLoading = false
      return module
    } catch (jsdelivrError) {
      try {
        // 如果 jsDelivr 失败，尝试使用 unpkg 的 ES 模块版本
        // @ts-ignore - 动态 import() URL 在运行时解析
        const module = await import(
          /* webpackIgnore: true */ ('https://unpkg.com/@imgly/background-removal@1.7.0/dist/index.esm.js' as any)
        )
        backgroundRemovalModule = module
        isLoading = false
        return module
      } catch (unpkgError) {
        isLoading = false
        throw new Error(
          `无法从 CDN 加载背景移除库。jsDelivr: ${jsdelivrError instanceof Error ? jsdelivrError.message : '未知错误'}, unpkg: ${unpkgError instanceof Error ? unpkgError.message : '未知错误'}`
        )
      }
    }
  })()

  return loadPromise
}

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

    // 从 CDN 加载背景移除库
    const bgRemovalModule = await loadBackgroundRemoval()
    
    // ES 模块版本直接导出 removeBackground 函数
    const removeBackground = bgRemovalModule.removeBackground || bgRemovalModule.default?.removeBackground || bgRemovalModule.default

    if (!removeBackground || typeof removeBackground !== 'function') {
      throw new Error('背景移除函数未正确加载')
    }

    // 使用 @imgly/background-removal 抠图，得到透明背景 PNG
    const transparentBlob = await removeBackground(imageFile, {
      format: 'image/png',
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
    throw new Error(
      error instanceof Error ? error.message : '背景替换失败'
    )
  }
}

