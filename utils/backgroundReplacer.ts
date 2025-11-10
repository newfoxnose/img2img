/**
 * 背景替换工具函数（基于 @imgly/background-removal）
 */

import { removeBackground } from '@imgly/background-removal'
import { env as ortEnv } from 'onnxruntime-web'

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
    // 配置 ONNX Runtime Web，避免多线程警告
    if (typeof ortEnv !== 'undefined' && 'wasm' in ortEnv && ortEnv.wasm) {
      ortEnv.wasm.numThreads = 1
      ortEnv.wasm.proxy = false
    }

    // 使用 @imgly/background-removal 抠图，得到透明背景 PNG
    const transparentBlob = await removeBackground(imageFile, {
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
    throw new Error(
      error instanceof Error ? error.message : '背景替换失败'
    )
  }
}

