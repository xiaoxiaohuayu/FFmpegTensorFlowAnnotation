import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

let model = null
let currentModelType = 'coco-ssd'

// 模型配置
const MODEL_CONFIGS = {
  'coco-ssd': {
    name: 'COCO-SSD',
    loader: async () => cocoSsd.load(),
    description: '通用对象检测模型',
    url: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3'
  }
  // 可以添加更多模型配置
  // 'yolov5': {
  //   name: 'YOLOv5',
  //   loader: async () => await import(...).then(m => m.load()),
  //   description: '轻量级对象检测',
  //   url: 'https://...'
  // }
}

export const getAvailableModels = () => {
  return Object.entries(MODEL_CONFIGS).map(([key, config]) => ({
    id: key,
    name: config.name,
    description: config.description,
    url: config.url
  }))
}

export const initModel = async (modelType = 'coco-ssd') => {
  if (model && currentModelType === modelType) return model
  
  try {
    // 如果已有模型，先卸载
    if (model) {
      unloadModel()
    }
    
    currentModelType = modelType
    const config = MODEL_CONFIGS[modelType]
    
    if (!config) {
      throw new Error(`Unknown model type: ${modelType}. Available models: ${Object.keys(MODEL_CONFIGS).join(', ')}`)
    }
    
    console.log(`Loading ${config.name} model from ${config.url}...`)
    model = await config.loader()
    console.log(`${config.name} model loaded successfully`)
    return model
  } catch (error) {
    console.error(`Failed to load model:`, error)
    throw error
  }
}

export const detectObjects = async (imageElement) => {
  if (!model) {
    await initModel()
  }
  
  try {
    const predictions = await model.detect(imageElement)
    return predictions
  } catch (error) {
    console.error('Detection error:', error)
    throw error
  }
}

export const filterPersonDetections = (predictions) => {
  return predictions.filter(pred => pred.class && pred.class === 'person')
}

export const drawDetections = (canvas, predictions, options = {}) => {
  const ctx = canvas.getContext('2d')
  const { 
    drawBoundingBox = true, 
    showConfidence = true,
    showLabel = true,
    lineWidth = 2,
    lineColor = '#00FF00',
    textColor = '#FFFFFF',
    textBgColor = 'rgba(0, 0, 0, 0.5)'
  } = options

  predictions.forEach(prediction => {
    // COCO-SSD returns [x, y, width, height]
    const [x, y, width, height] = prediction.bbox
    const confidence = (prediction.score * 100).toFixed(1)
    const label = prediction.class || 'unknown'

    if (drawBoundingBox) {
      // Draw bounding box
      ctx.strokeStyle = lineColor
      ctx.lineWidth = lineWidth
      ctx.strokeRect(x, y, width, height)

      // Draw label and confidence
      if (showLabel || showConfidence) {
        let text = label
        if (showConfidence) {
          text += ` ${confidence}%`
        }

        ctx.fillStyle = textBgColor
        ctx.font = 'bold 14px Arial'
        const textMetrics = ctx.measureText(text)
        const textHeight = 18
        
        ctx.fillRect(x, y - textHeight - 4, textMetrics.width + 8, textHeight + 4)
        ctx.fillStyle = textColor
        ctx.fillText(text, x + 4, y - 6)
      }
    }
  })
}

export const unloadModel = () => {
  if (model) {
    model.dispose()
    model = null
    currentModelType = 'coco-ssd'
  }
}

export const getCurrentModel = () => {
  return model
}

export const getCurrentModelType = () => {
  return currentModelType
}
