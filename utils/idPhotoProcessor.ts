/**
 * 证件照处理工具函数
 * 支持裁剪、调整亮度对比度、尺寸调整等功能
 */

// 使用 require 方式导入 piexifjs（CommonJS 模块）
// @ts-ignore - piexifjs 是 CommonJS 模块
const piexif = require('piexifjs')

// 证件照尺寸配置
export type IDPhotoSize = '1inch' | '2inch-large'

export interface IDPhotoSizeConfig {
  width: number
  height: number
  name: string
}

// 证件照尺寸映射
export const ID_PHOTO_SIZES: Record<IDPhotoSize, IDPhotoSizeConfig> = {
  '1inch': {
    width: 295,
    height: 413,
    name: '1寸',
  },
  '2inch-large': {
    width: 413,
    height: 626,
    name: '大2寸',
  },
}

// 裁剪参数接口
export interface CropParams {
  x: number // 裁剪区域左上角 x 坐标
  y: number // 裁剪区域左上角 y 坐标
  width: number // 裁剪区域宽度
  height: number // 裁剪区域高度
}

// 图片调整参数接口
export interface AdjustParams {
  brightness: number // 亮度 (-100 到 100)
  contrast: number // 对比度 (-100 到 100)
  saturation: number // 饱和度 (-100 到 100)
}

// 背景颜色类型（从 backgroundReplacer 导入）
export type BackgroundColor = 'white' | 'red' | 'royal-blue' | 'sky-blue'

/**
 * 设置图片的 DPI 为 300
 * @param imageFile 原始图片文件
 * @returns Promise<File> 设置 DPI 后的图片文件
 */
export async function setImageDPI(imageFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const result = e.target?.result
      if (!result || typeof result !== 'string') {
        reject(new Error('文件读取失败'))
        return
      }

      try {
        // piexifjs 需要 base64 数据（不带 data:image/jpeg;base64, 前缀）
        const base64Data = result.split(',')[1] || result

        // 创建 EXIF 数据
        let exifObj: any = {}
        try {
          // 尝试读取现有的 EXIF 数据
          exifObj = piexif.load(base64Data)
        } catch {
          // 如果没有 EXIF 数据，创建新的
          exifObj = {
            '0th': {},
            'Exif': {},
            'GPS': {},
            'Interop': {},
            '1st': {},
            'thumbnail': null,
          }
        }

        // 设置分辨率单位为英寸 (2 = 英寸, 1 = 厘米)
        exifObj['0th'][296] = 2 // ResolutionUnit: 英寸
        // 设置 X 分辨率 (DPI)
        exifObj['0th'][282] = [300, 1] // XResolution: 300 DPI
        // 设置 Y 分辨率 (DPI)
        exifObj['0th'][283] = [300, 1] // YResolution: 300 DPI

        // 将 EXIF 数据嵌入到图片中
        const exifStr = piexif.dump(exifObj)
        const newDataURL = piexif.insert(exifStr, result)

        // 将 DataURL 转换为 Blob，然后转换为 File
        const base64Part = newDataURL.includes(',')
          ? newDataURL.split(',')[1]
          : newDataURL
        const byteString = atob(base64Part)
        const ab = new ArrayBuffer(byteString.length)
        const ia = new Uint8Array(ab)
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i)
        }

        const blob = new Blob([ab], { type: imageFile.type || 'image/jpeg' })
        const newFile = new File([blob], imageFile.name, {
          type: imageFile.type || 'image/jpeg',
          lastModified: Date.now(),
        })

        resolve(newFile)
      } catch (error) {
        console.warn('设置 DPI 失败，使用原始文件:', error)
        // 如果设置失败，返回原始文件
        resolve(imageFile)
      }
    }

    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    // 以 Data URL 方式读取文件
    reader.readAsDataURL(imageFile)
  })
}

/**
 * 应用图片调整参数到 Canvas 上下文
 * @param ctx Canvas 2D 上下文
 * @param adjustParams 调整参数
 */
function applyImageAdjustments(
  ctx: CanvasRenderingContext2D,
  adjustParams: AdjustParams
) {
  // 将各参数转换为 CSS filter 所需的格式
  const brightnessValue = (adjustParams.brightness + 100) / 100
  const contrastValue = (adjustParams.contrast + 100) / 100
  const saturationValue = (adjustParams.saturation + 100) / 100
  
  // 构建 filter 字符串
  const filters: string[] = []
  
  // 亮度
  filters.push(`brightness(${brightnessValue})`)
  
  // 对比度
  filters.push(`contrast(${contrastValue})`)
  
  // 饱和度
  filters.push(`saturate(${saturationValue})`)

  // 使用 Canvas filter 属性（现代浏览器支持）
  if ('filter' in ctx) {
    ctx.filter = filters.join(' ')
  } else {
    // 降级方案：使用 ImageData 手动处理（性能较差）
    // 这里不做实现，因为现代浏览器都支持 filter
  }
}

/**
 * 处理图片为证件照
 * @param imageFile 原始图片文件
 * @param size 证件照尺寸
 * @param cropParams 裁剪参数
 * @param adjustParams 调整参数（亮度和对比度）
 * @param backgroundColor 背景颜色（可选，如果提供则进行智能抠图换背景）
 * @returns Promise<Blob> 处理后的证件照 Blob
 */
export async function processIDPhoto(
  imageFile: File,
  size: IDPhotoSize,
  cropParams: CropParams,
  adjustParams: AdjustParams,
  backgroundColor?: BackgroundColor
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const result = e.target?.result
      if (!result) {
        reject(new Error('文件读取失败'))
        return
      }

      const img = new Image()

      img.onload = async () => {
        try {
          // 获取目标尺寸
          const targetSize = ID_PHOTO_SIZES[size]

          // 创建源 Canvas 用于裁剪和调整
          const sourceCanvas = document.createElement('canvas')
          sourceCanvas.width = img.width
          sourceCanvas.height = img.height
          const sourceCtx = sourceCanvas.getContext('2d')
          if (!sourceCtx) {
            reject(new Error('无法创建 Canvas 上下文'))
            return
          }

          // 应用图片调整参数
          applyImageAdjustments(sourceCtx, adjustParams)

          // 绘制原始图片到源 Canvas
          sourceCtx.drawImage(img, 0, 0)

          // 创建目标 Canvas 用于生成证件照
          const targetCanvas = document.createElement('canvas')
          targetCanvas.width = targetSize.width
          targetCanvas.height = targetSize.height
          const targetCtx = targetCanvas.getContext('2d')
          if (!targetCtx) {
            reject(new Error('无法创建目标 Canvas 上下文'))
            return
          }

          // 填充背景颜色
          // 如果指定了背景颜色，会在后面进行智能抠图处理
          // 这里先填充默认白色背景
          if (backgroundColor) {
            // 导入背景颜色配置
            const { BACKGROUND_COLORS } = await import('./backgroundReplacer')
            const bgColor = BACKGROUND_COLORS[backgroundColor]
            targetCtx.fillStyle = bgColor.hex
          } else {
            targetCtx.fillStyle = '#FFFFFF'
          }
          targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height)

          // 计算裁剪区域（确保不超出图片范围）
          const cropX = Math.max(0, Math.min(cropParams.x, img.width - 1))
          const cropY = Math.max(0, Math.min(cropParams.y, img.height - 1))
          const cropWidth = Math.min(
            cropParams.width,
            img.width - cropX
          )
          const cropHeight = Math.min(
            cropParams.height,
            img.height - cropY
          )

          // 如果指定了背景颜色，先进行智能抠图处理
          if (backgroundColor) {
            try {
              // 导入背景替换函数
              const { replaceBackground } = await import('./backgroundReplacer')
              
              // 创建临时 Canvas 用于背景替换
              const tempCanvas = document.createElement('canvas')
              tempCanvas.width = cropWidth
              tempCanvas.height = cropHeight
              const tempCtx = tempCanvas.getContext('2d')
              if (!tempCtx) {
                throw new Error('无法创建临时 Canvas 上下文')
              }
              
              // 绘制裁剪区域到临时 Canvas
              tempCtx.drawImage(
                sourceCanvas,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                0,
                0,
                cropWidth,
                cropHeight
              )
              
              // 将临时 Canvas 转换为 Blob
              const tempBlob = await new Promise<Blob>((resolve, reject) => {
                tempCanvas.toBlob(
                  (blob) => {
                    if (blob) {
                      resolve(blob)
                    } else {
                      reject(new Error('转换失败'))
                    }
                  },
                  'image/jpeg',
                  0.95
                )
              })
              
              // 创建临时 File 对象
              const tempFile = new File([tempBlob], 'temp.jpg', { type: 'image/jpeg' })
              
              // 执行背景替换
              const replacedBlob = await replaceBackground(tempFile, backgroundColor)
              
              // 将替换背景后的图片绘制到目标 Canvas
              const replacedImg = new Image()
              await new Promise((resolve, reject) => {
                replacedImg.onload = () => {
                  targetCtx.drawImage(
                    replacedImg,
                    0,
                    0,
                    targetCanvas.width,
                    targetCanvas.height
                  )
                  resolve(null)
                }
                replacedImg.onerror = () => reject(new Error('背景替换后的图片加载失败'))
                replacedImg.src = URL.createObjectURL(replacedBlob)
              })
              
              // 清理 URL
              URL.revokeObjectURL(replacedImg.src)
            } catch (bgError) {
              console.warn('背景替换失败，使用默认处理:', bgError)
              // 如果背景替换失败，使用默认方式绘制
              targetCtx.drawImage(
                sourceCanvas,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                0,
                0,
                targetCanvas.width,
                targetCanvas.height
              )
            }
          } else {
            // 将裁剪后的图片绘制到目标 Canvas，并缩放到目标尺寸
            targetCtx.drawImage(
              sourceCanvas,
              cropX,
              cropY,
              cropWidth,
              cropHeight,
              0,
              0,
              targetCanvas.width,
              targetCanvas.height
            )
          }

          // 转换为 DataURL (使用 JPG 格式，质量 0.95)
          const dataURL = targetCanvas.toDataURL('image/jpeg', 0.95)
          
          // 设置 DPI 为 300（确保最终输出的证件照也有正确的 DPI）
          try {
            // piexifjs 需要 base64 数据（不带 data:image/jpeg;base64, 前缀）
            const base64Data = dataURL.split(',')[1]
            
            // 创建 EXIF 数据
            let exifObj: any = {}
            try {
              // 尝试读取现有的 EXIF 数据
              exifObj = piexif.load(base64Data)
            } catch {
              // 如果没有 EXIF 数据，创建新的
              exifObj = { '0th': {}, 'Exif': {}, 'GPS': {}, 'Interop': {}, '1st': {}, 'thumbnail': null }
            }
            
            // 设置分辨率单位为英寸 (2 = 英寸, 1 = 厘米)
            // TIFF 标签：296 = ResolutionUnit, 282 = XResolution, 283 = YResolution
            exifObj['0th'][296] = 2  // ResolutionUnit: 英寸
            // 设置 X 分辨率 (DPI) - 格式为 [numerator, denominator]
            exifObj['0th'][282] = [300, 1]  // XResolution: 300 DPI
            // 设置 Y 分辨率 (DPI)
            exifObj['0th'][283] = [300, 1]  // YResolution: 300 DPI
            
            // 将 EXIF 数据嵌入到图片中
            const exifStr = piexif.dump(exifObj)
            const newDataURL = piexif.insert(exifStr, dataURL)
            
            // 将 DataURL 转换为 Blob
            const base64Part = newDataURL.includes(',') 
              ? newDataURL.split(',')[1] 
              : newDataURL
            const byteString = atob(base64Part)
            const mimeString = newDataURL.includes(',')
              ? newDataURL.split(',')[0].split(':')[1].split(';')[0]
              : 'image/jpeg'
            const ab = new ArrayBuffer(byteString.length)
            const ia = new Uint8Array(ab)
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i)
            }
            const blob = new Blob([ab], { type: mimeString })
            
            resolve(blob)
          } catch (exifError) {
            // 如果 EXIF 处理失败，使用原始 Blob
            console.warn('设置 DPI 失败，使用原始图片:', exifError)
            // 将 DataURL 转换为 Blob
            const byteString = atob(dataURL.split(',')[1])
            const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0]
            const ab = new ArrayBuffer(byteString.length)
            const ia = new Uint8Array(ab)
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i)
            }
            const blob = new Blob([ab], { type: mimeString })
            resolve(blob)
          }
        } catch (error) {
          reject(
            error instanceof Error
              ? error
              : new Error('处理过程中发生错误')
          )
        }
      }

      img.onerror = () => {
        reject(new Error('图片加载失败，请确保文件是有效的图片格式'))
      }

      // 设置图片源
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

    // 以 Data URL 方式读取文件
    reader.readAsDataURL(imageFile)
  })
}

