/**
 * 模型配置文件
 * 包含所有支持的模型及其加载地址
 */

export const DETECTION_MODELS = {
  'coco-ssd': {
    name: 'COCO-SSD',
    description: '通用对象检测模型',
    version: '2.2.3',
    url: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3',
    provider: 'TensorFlow.js',
    performance: '中等',
    accuracy: '高',
    classes: ['person', 'bicycle', 'car', 'motorbike', 'aeroplane', 'bus', 'train', 'truck', 'boat', 'traffic light']
  }
  // 可以添加更多模型配置
  // 'yolov5': {
  //   name: 'YOLOv5',
  //   description: '实时对象检测',
  //   version: '1.0.0',
  //   url: 'https://...',
  //   provider: 'Ultralytics',
  //   performance: '高',
  //   accuracy: '高',
  //   classes: [...]
  // }
}

export const SEGMENTATION_MODELS = {
  'mobilenet': {
    name: 'MobileNetV1',
    description: '轻量级人物分割模型',
    version: '2.2.0',
    url: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.2.0',
    provider: 'TensorFlow.js',
    performance: '快速',
    accuracy: '中等',
    parameters: {
      architecture: 'MobileNetV1',
      outputStride: 16,
      multiplier: 0.75,
      quantBytes: 2
    }
  },
  'resnet': {
    name: 'ResNet50',
    description: '高精度人物分割模型',
    version: '2.2.0',
    url: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.2.0',
    provider: 'TensorFlow.js',
    performance: '慢速',
    accuracy: '高',
    parameters: {
      architecture: 'ResNet50',
      outputStride: 32,
      quantBytes: 2
    }
  }
}

export const TF_JS_CONFIG = {
  version: '4.11.0',
  url: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0',
  backends: ['webgl', 'wasm', 'cpu'],
  defaultBackend: 'webgl'
}

export const FFMPEG_CONFIG = {
  version: '0.12.6',
  url: 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.6'
}

/**
 * 获取模型加载URL
 * @param {string} modelType - 模型类型 (coco-ssd, yolov5等)
 * @returns {string} - 模型URL
 */
export const getModelUrl = (modelType) => {
  const model = DETECTION_MODELS[modelType]
  if (!model) {
    throw new Error(`Model ${modelType} not found in configuration`)
  }
  return model.url
}

/**
 * 获取分割模型配置
 * @param {string} configType - 配置类型 (mobilenet, resnet等)
 * @returns {object} - 模型配置
 */
export const getSegmentationModelConfig = (configType) => {
  const config = SEGMENTATION_MODELS[configType]
  if (!config) {
    throw new Error(`Segmentation config ${configType} not found in configuration`)
  }
  return config
}

/**
 * 获取所有可用的检测模型列表
 */
export const getAvailableDetectionModels = () => {
  return Object.entries(DETECTION_MODELS).map(([key, value]) => ({
    id: key,
    ...value
  }))
}

/**
 * 获取所有可用的分割模型列表
 */
export const getAvailableSegmentationModels = () => {
  return Object.entries(SEGMENTATION_MODELS).map(([key, value]) => ({
    id: key,
    ...value
  }))
}

/**
 * 自定义模型加载（用于加载自己的模型）
 * @param {string} customUrl - 自定义模型URL
 * @param {function} loaderFunction - 加载函数
 */
export const registerCustomModel = (modelName, config) => {
  DETECTION_MODELS[modelName] = config
}

/**
 * 自定义分割模型
 */
export const registerCustomSegmentationModel = (configName, config) => {
  SEGMENTATION_MODELS[configName] = config
}
