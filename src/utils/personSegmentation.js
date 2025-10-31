import * as bodyPix from '@tensorflow-models/body-pix'

let segmentationModel = null
let currentSegmentationConfig = {}

// 分割模型配置
const SEGMENTATION_CONFIGS = {
  'mobilenet': {
    architecture: 'MobileNetV1',
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 2,
    url: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.2.0'
  },
  'resnet': {
    architecture: 'ResNet50',
    outputStride: 32,
    quantBytes: 2,
    url: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.2.0'
  }
}

export const getAvailableSegmentationModels = () => {
  return Object.entries(SEGMENTATION_CONFIGS).map(([key, config]) => ({
    id: key,
    architecture: config.architecture,
    url: config.url
  }))
}

export const initSegmentationModel = async (configType = 'mobilenet') => {
  if (segmentationModel && currentSegmentationConfig.architecture === SEGMENTATION_CONFIGS[configType].architecture) {
    return segmentationModel
  }
  try {
    // 如果已有模型，先卸载
    if (segmentationModel) {
      unloadSegmentationModel()
    }
    
    const config = SEGMENTATION_CONFIGS[configType]
    if (!config) {
      throw new Error(`Unknown segmentation config: ${configType}. Available configs: ${Object.keys(SEGMENTATION_CONFIGS).join(', ')}`)
    }
    
    console.log(`Loading BodyPix ${config.architecture} model...`)
    currentSegmentationConfig = config
    segmentationModel = await bodyPix.load(config)
    console.log(`BodyPix ${config.architecture} model loaded successfully`)
    return segmentationModel
  } catch (error) {
    console.error('Failed to load BodyPix model:', error)
    throw error
  }
}

export const segmentPerson = async (imageElement) => {
  if (!segmentationModel) {
    await initSegmentationModel()
  }

  try {
    const segmentation = await segmentationModel.segmentPerson(imageElement, {
      flipHorizontal: false,
      internalResolution: 'medium',
      segmentationThreshold: 0.5
    })
    return segmentation
  } catch (error) {
    console.error('Segmentation error:', error)
    throw error
  }
}

export const drawPersonContour = (canvas, segmentation, options = {}) => {
  const {
    contourColor = '#00FF00',
    contourWidth = 3,
    opacity = 1.0
  } = options

  const ctx = canvas.getContext('2d')
  const segmentationData = segmentation.data
  const width = segmentation.width
  const height = segmentation.height

  // 计算缩放因子（segmentation 分辨率 -> canvas 分辨率）
  const scaleX = canvas.width / width
  const scaleY = canvas.height / height

  // 解析颜色
  const rgb = hexToRgb(contourColor)
  const alphaValue = Math.floor(255 * opacity)
  
  // 用于返回的边缘点
  const edgePoints = []

  // 创建边缘叠加层（不覆盖原图）
  const imageData = ctx.createImageData(canvas.width, canvas.height)
  const data = imageData.data

  // 缩放分割数据到 canvas 大小，并检测边缘
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const srcX = Math.floor(x / scaleX)
      const srcY = Math.floor(y / scaleY)
      const srcIdx = srcY * width + srcX
      const isForeground = segmentationData[srcIdx] > 0

      // 检查这个像素是否在边缘上
      let isEdge = false
      
      // 检查相邻像素
      for (let dy = -1; dy <= 1 && !isEdge; dy++) {
        for (let dx = -1; dx <= 1 && !isEdge; dx++) {
          if (dx === 0 && dy === 0) continue
          
          const nx = srcX + dx
          const ny = srcY + dy
          
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            isEdge = isForeground
          } else {
            const nidx = ny * width + nx
            if ((segmentationData[nidx] > 0) !== isForeground) {
              isEdge = true
            }
          }
        }
      }

      const idx = (y * canvas.width + x) * 4
      if (isEdge) {
        data[idx] = rgb.r
        data[idx + 1] = rgb.g
        data[idx + 2] = rgb.b
        data[idx + 3] = alphaValue
        // 收集边缘点
        edgePoints.push({ x, y })
      } else {
        data[idx + 3] = 0  // 非边缘像素完全透明
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
  
  // 返回边缘点供后续使用
  return edgePoints
}

export const drawPersonSilhouette = (canvas, segmentation, options = {}) => {
  const {
    fillColor = '#00FF00',
    fillOpacity = 0.3,
    contourColor = '#00FF00',
    contourWidth = 2
  } = options

  const ctx = canvas.getContext('2d')
  const segmentationData = segmentation.data
  const width = segmentation.width
  const height = segmentation.height

  // 计算缩放因子
  const scaleX = canvas.width / width
  const scaleY = canvas.height / height

  const fillRgb = hexToRgb(fillColor)
  const contourRgb = hexToRgb(contourColor)

  // 创建填充层
  const fillImageData = ctx.createImageData(canvas.width, canvas.height)
  const fillData = fillImageData.data

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const srcX = Math.floor(x / scaleX)
      const srcY = Math.floor(y / scaleY)
      const srcIdx = srcY * width + srcX
      const isForeground = segmentationData[srcIdx] > 0

      const idx = (y * canvas.width + x) * 4
      if (isForeground) {
        fillData[idx] = fillRgb.r
        fillData[idx + 1] = fillRgb.g
        fillData[idx + 2] = fillRgb.b
        fillData[idx + 3] = Math.floor(255 * fillOpacity)
      }
    }
  }

  ctx.putImageData(fillImageData, 0, 0)

  // 绘制轮廓
  const contourImageData = ctx.createImageData(canvas.width, canvas.height)
  const contourData = contourImageData.data

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const srcX = Math.floor(x / scaleX)
      const srcY = Math.floor(y / scaleY)
      const srcIdx = srcY * width + srcX
      const isForeground = segmentationData[srcIdx] > 0

      let isEdge = false
      
      for (let dy = -1; dy <= 1 && !isEdge; dy++) {
        for (let dx = -1; dx <= 1 && !isEdge; dx++) {
          if (dx === 0 && dy === 0) continue
          
          const nx = srcX + dx
          const ny = srcY + dy
          
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            isEdge = isForeground
          } else {
            const nidx = ny * width + nx
            if ((segmentationData[nidx] > 0) !== isForeground) {
              isEdge = true
            }
          }
        }
      }

      const idx = (y * canvas.width + x) * 4
      if (isEdge) {
        contourData[idx] = contourRgb.r
        contourData[idx + 1] = contourRgb.g
        contourData[idx + 2] = contourRgb.b
        contourData[idx + 3] = 255
      }
    }
  }

  ctx.putImageData(contourImageData, 0, 0)
}

// 辅助函数：将十六进制颜色转换为 RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 255, b: 0 }
}

export const unloadSegmentationModel = () => {
  if (segmentationModel) {
    segmentationModel.dispose()
    segmentationModel = null
    currentSegmentationConfig = {}
  }
}

export const getCurrentSegmentationModel = () => {
  return segmentationModel
}

export const getCurrentSegmentationConfig = () => {
  return currentSegmentationConfig
}
