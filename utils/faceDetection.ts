/**
 * 人脸检测工具函数
 * 使用 face-api.js 进行人脸检测和定位
 */

import * as faceapi from 'face-api.js'

// 模型是否已加载
let modelsLoaded = false

// 模型加载状态
let modelLoadingPromise: Promise<void> | null = null

/**
 * 检查本地模型文件是否存在
 * @param modelName 模型名称
 * @returns 是否存在
 */
async function checkLocalModelExists(modelName: string): Promise<boolean> {
  try {
    const response = await fetch(`/models/${modelName}`, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * 加载 face-api.js 模型
 * 优先从本地加载，如果本地不存在则从 CDN 加载
 */
export async function loadFaceDetectionModels(): Promise<void> {
  // 如果已经加载，直接返回
  if (modelsLoaded) {
    return Promise.resolve()
  }

  // 如果正在加载，返回加载中的 Promise
  if (modelLoadingPromise) {
    return modelLoadingPromise
  }

  // 开始加载模型
  modelLoadingPromise = (async () => {
    try {
      // 优先尝试从本地加载模型
      const LOCAL_MODEL_URL = '/models/'
      const CDN_MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/'

      // 检查本地模型文件是否存在
      const hasLocalModels =
        (await checkLocalModelExists('tiny_face_detector_model-weights_manifest.json')) &&
        (await checkLocalModelExists('tiny_face_detector_model-shard1')) &&
        (await checkLocalModelExists('face_landmark_68_model-weights_manifest.json')) &&
        (await checkLocalModelExists('face_landmark_68_model-shard1'))

      const modelUrl = hasLocalModels ? LOCAL_MODEL_URL : CDN_MODEL_URL

      if (hasLocalModels) {
        console.log('使用本地模型文件加载')
      } else {
        console.log('本地模型文件不存在，从 CDN 加载')
      }

      // 加载所需的模型
      await Promise.all([
        // 人脸检测模型（最轻量，适合快速检测）
        faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
        // 人脸关键点检测模型（用于更精确的定位）
        faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
      ])

      modelsLoaded = true
      console.log('人脸检测模型加载完成')
    } catch (error) {
      console.error('模型加载失败:', error)
      modelsLoaded = false
      modelLoadingPromise = null
      throw new Error('人脸检测模型加载失败，请检查网络连接或运行 npm run download-models 下载本地模型')
    }
  })()

  return modelLoadingPromise
}

/**
 * 检测图片中的人脸位置
 * @param image 图片元素或图片 URL
 * @returns 返回人脸检测结果，包含人脸位置信息
 */
export async function detectFace(
  image: HTMLImageElement | string
): Promise<faceapi.FaceDetection[] | null> {
  try {
    // 确保模型已加载
    await loadFaceDetectionModels()

    // 如果是字符串（URL），创建图片元素
    let imgElement: HTMLImageElement
    if (typeof image === 'string') {
      imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = image
      })
    } else {
      imgElement = image
    }

    // 使用 tinyFaceDetector 进行人脸检测
    // 检测所有人脸并获取关键点
    const detections = await faceapi
      .detectAllFaces(imgElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()

    return detections.length > 0 ? detections : null
  } catch (error) {
    console.error('人脸检测失败:', error)
    return null
  }
}

/**
 * 根据人脸位置计算证件照裁剪区域
 * @param faceDetection 人脸检测结果
 * @param imageWidth 图片宽度
 * @param imageHeight 图片高度
 * @param targetAspectRatio 目标宽高比（宽/高）
 * @returns 裁剪参数 { x, y, width, height }
 */
export function calculateCropFromFace(
  faceDetection: faceapi.FaceDetection,
  imageWidth: number,
  imageHeight: number,
  targetAspectRatio: number
): { x: number; y: number; width: number; height: number } {
  // 获取人脸边界框
  const box = faceDetection.detection.box

  // 人脸中心点
  const faceCenterX = box.x + box.width / 2
  const faceCenterY = box.y + box.height / 2

  // 证件照中，人脸通常位于上方 1/3 到 1/2 的位置
  // 根据人脸位置和目标宽高比计算裁剪区域

  // 计算人脸高度占图片的比例（用于确定合适的裁剪高度）
  const faceHeightRatio = box.height / imageHeight

  // 证件照中，人脸高度通常占整张照片的 30-40%
  // 根据这个比例计算合适的裁剪高度
  const targetFaceHeightRatio = 0.35 // 人脸占裁剪区域高度的 35%
  const cropHeight = box.height / targetFaceHeightRatio

  // 根据目标宽高比计算裁剪宽度
  const cropWidth = cropHeight * targetAspectRatio

  // 计算裁剪起始位置
  // X 坐标：以人脸中心为基准，向左偏移裁剪宽度的一半
  let cropX = faceCenterX - cropWidth / 2

  // Y 坐标：人脸中心应该在裁剪区域的上方 1/3 到 2/5 位置
  // 假设人脸中心在裁剪区域的 2/5 位置
  const faceCenterRatioInCrop = 0.4
  const cropY = faceCenterY - cropHeight * faceCenterRatioInCrop

  // 确保裁剪区域不超出图片边界
  cropX = Math.max(0, Math.min(cropX, imageWidth - cropWidth))
  const finalCropY = Math.max(0, Math.min(cropY, imageHeight - cropHeight))

  // 如果调整后超出边界，重新计算
  let finalCropX = cropX
  if (finalCropX + cropWidth > imageWidth) {
    finalCropX = imageWidth - cropWidth
  }
  if (finalCropY + cropHeight > imageHeight) {
    // 如果高度超出，以图片高度为准，重新计算宽度
    const adjustedHeight = imageHeight
    const adjustedWidth = adjustedHeight * targetAspectRatio
    finalCropX = Math.max(0, Math.min(faceCenterX - adjustedWidth / 2, imageWidth - adjustedWidth))
    return {
      x: finalCropX,
      y: 0,
      width: adjustedWidth,
      height: adjustedHeight,
    }
  }

  return {
    x: finalCropX,
    y: finalCropY,
    width: cropWidth,
    height: cropHeight,
  }
}

/**
 * 自动检测人脸并返回裁剪参数
 * @param imageUrl 图片 URL
 * @param imageWidth 图片宽度
 * @param imageHeight 图片高度
 * @param targetAspectRatio 目标宽高比（宽/高）
 * @returns 裁剪参数，如果检测失败返回 null
 */
export async function autoDetectAndCrop(
  imageUrl: string,
  imageWidth: number,
  imageHeight: number,
  targetAspectRatio: number
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  try {
    const detections = await detectFace(imageUrl)

    if (!detections || detections.length === 0) {
      return null
    }

    // 使用检测到的第一个人脸（通常照片中只有一个人）
    const faceDetection = detections[0]

    // 计算裁剪区域
    const cropParams = calculateCropFromFace(
      faceDetection,
      imageWidth,
      imageHeight,
      targetAspectRatio
    )

    return cropParams
  } catch (error) {
    console.error('自动检测失败:', error)
    return null
  }
}

