/**
 * 图片格式转换工具函数
 * 支持多种图片格式之间的转换
 */

// 支持的输出格式类型
export type OutputFormat = 'jpg' | 'png' | 'webp'

// 输出格式配置
export interface FormatConfig {
  mimeType: string
  quality?: number // 质量参数（0-1），仅适用于有损格式
}

// 输出格式映射
const FORMAT_CONFIGS: Record<OutputFormat, FormatConfig> = {
  jpg: {
    mimeType: 'image/jpeg',
    quality: 0.92, // JPG 质量
  },
  png: {
    mimeType: 'image/png',
    // PNG 是无损格式，不需要质量参数
  },
  webp: {
    mimeType: 'image/webp',
    quality: 0.92, // WebP 质量
  },
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
  return new Promise((resolve, reject) => {
    // 创建 FileReader 读取文件
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const result = e.target?.result
      if (!result) {
        reject(new Error('文件读取失败'))
        return
      }

      // 创建图片对象
      const img = new Image()
      
      img.onload = () => {
        try {
          // 创建 Canvas 用于转换
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height

          // 获取 Canvas 2D 上下文
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('无法创建 Canvas 上下文'))
            return
          }

          // 对于 PNG 格式，确保透明背景保持透明
          if (outputFormat === 'png') {
            // PNG 格式自动支持透明度
            ctx.clearRect(0, 0, canvas.width, canvas.height)
          } else {
            // 对于 JPG 和 WebP，使用白色背景填充（因为不支持透明度）
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }

          // 将图片绘制到 Canvas 上
          ctx.drawImage(img, 0, 0)

          // 获取格式配置
          const config = FORMAT_CONFIGS[outputFormat]

          // 将 Canvas 转换为 Blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('图片转换失败'))
              }
            },
            config.mimeType, // 输出格式
            config.quality // 质量参数（如果支持）
          )
        } catch (error) {
          reject(error instanceof Error ? error : new Error('转换过程中发生错误'))
        }
      }

      img.onerror = () => {
        reject(new Error('图片加载失败，请确保文件是有效的图片格式'))
      }

      // 设置图片源（可以是 Data URL 或 Blob URL）
      if (typeof result === 'string') {
        img.src = result
      } else {
        // 如果是 ArrayBuffer，转换为 Blob URL
        const blob = new Blob([result])
        img.src = URL.createObjectURL(blob)
      }
    }

    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    // 以 Data URL 方式读取文件
    reader.readAsDataURL(file)
  })
}

/**
 * 将图片文件转换为 JPG 格式（向后兼容）
 * @param file 原始图片文件
 * @returns Promise<Blob> 转换后的 JPG 图片 Blob
 */
export async function convertImageToJPG(file: File): Promise<Blob> {
  return convertImage(file, 'jpg')
}

