/**
 * 导出标注数据为 JSON 格式
 * 包含检测对象的位置、类别和置信度信息
 */

export const exportDetectionData = (predictions, imageInfo = {}) => {
  const {
    fileName = 'image.jpg',
    width = 0,
    height = 0,
    timestamp = new Date().toISOString()
  } = imageInfo

  const annotations = predictions.map((pred, index) => {
    const [x, y, w, h] = pred.bbox
    return {
      id: index,
      class: pred.class || 'unknown',
      confidence: parseFloat((pred.score * 100).toFixed(2)),
      bbox: {
        x: parseFloat(x.toFixed(2)),
        y: parseFloat(y.toFixed(2)),
        width: parseFloat(w.toFixed(2)),
        height: parseFloat(h.toFixed(2)),
        // 也提供右下角坐标便于参考
        x2: parseFloat((x + w).toFixed(2)),
        y2: parseFloat((y + h).toFixed(2))
      },
      // 中心点坐标
      center: {
        x: parseFloat((x + w / 2).toFixed(2)),
        y: parseFloat((y + h / 2).toFixed(2))
      }
    }
  })

  return {
    metadata: {
      fileName,
      imageWidth: width,
      imageHeight: height,
      timestamp,
      totalDetections: predictions.length
    },
    annotations
  }
}

export const exportSegmentationData = (segmentation, imageInfo = {}) => {
  const {
    fileName = 'image.jpg',
    timestamp = new Date().toISOString()
  } = imageInfo

  const segmentationData = {
    metadata: {
      fileName,
      timestamp,
      segmentationWidth: segmentation.width,
      segmentationHeight: segmentation.height,
      format: 'uint8 array - 0: background, >0: person'
    },
    data: Array.from(segmentation.data),
    // 计算人物像素百分比
    personPixelPercentage: calculatePersonPercentage(segmentation.data)
  }

  return segmentationData
}

export const exportCombinedData = (predictions, segmentation, imageInfo = {}) => {
  const {
    fileName = 'image.jpg',
    width = 0,
    height = 0,
    timestamp = new Date().toISOString()
  } = imageInfo

  const detectionData = exportDetectionData(predictions, { fileName, width, height, timestamp })
  const segmentationData = exportSegmentationData(segmentation, { fileName, timestamp })

  return {
    metadata: {
      fileName,
      imageWidth: width,
      imageHeight: height,
      timestamp,
      detectionModel: 'COCO-SSD',
      segmentationModel: 'BodyPix'
    },
    detection: detectionData,
    segmentation: segmentationData
  }
}

/**
 * 导出为 COCO 格式（用于训练）
 */
export const exportCOCOFormat = (predictions, imageInfo = {}) => {
  const {
    fileName = 'image.jpg',
    width = 0,
    height = 0,
    imageId = 1
  } = imageInfo

  const coco = {
    images: [
      {
        id: imageId,
        file_name: fileName,
        width,
        height
      }
    ],
    annotations: predictions.map((pred, index) => {
      const [x, y, w, h] = pred.bbox
      return {
        id: index,
        image_id: imageId,
        category_id: getCategoryId(pred.class),
        bbox: [x, y, w, h],
        area: w * h,
        iscrowd: 0
      }
    }),
    categories: getCocoCategories()
  }

  return coco
}

/**
 * 导出为 Pascal VOC XML 格式
 */
export const exportPascalVOC = (predictions, imageInfo = {}) => {
  const {
    fileName = 'image.jpg',
    width = 0,
    height = 0,
    depth = 3
  } = imageInfo

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<annotation>\n'
  xml += `  <folder>annotations</folder>\n`
  xml += `  <filename>${fileName}</filename>\n`
  xml += `  <path>/path/to/${fileName}</path>\n`
  xml += `  <source>\n`
  xml += `    <database>FFmpeg-TensorFlow Annotator</database>\n`
  xml += `  </source>\n`
  xml += `  <size>\n`
  xml += `    <width>${width}</width>\n`
  xml += `    <height>${height}</height>\n`
  xml += `    <depth>${depth}</depth>\n`
  xml += `  </size>\n`
  xml += `  <segmented>0</segmented>\n`

  predictions.forEach((pred) => {
    const [x, y, w, h] = pred.bbox
    xml += `  <object>\n`
    xml += `    <name>${pred.class}</name>\n`
    xml += `    <pose>Unspecified</pose>\n`
    xml += `    <truncated>0</truncated>\n`
    xml += `    <difficult>0</difficult>\n`
    xml += `    <bndbox>\n`
    xml += `      <xmin>${Math.round(x)}</xmin>\n`
    xml += `      <ymin>${Math.round(y)}</ymin>\n`
    xml += `      <xmax>${Math.round(x + w)}</xmax>\n`
    xml += `      <ymax>${Math.round(y + h)}</ymax>\n`
    xml += `    </bndbox>\n`
    xml += `    <confidence>${(pred.score * 100).toFixed(2)}</confidence>\n`
    xml += `  </object>\n`
  })

  xml += '</annotation>'

  return xml
}

/**
 * 导出为 YOLO 格式（TXT 文件）
 */
export const exportYOLOFormat = (predictions, imageInfo = {}) => {
  const { width = 0, height = 0 } = imageInfo

  if (width === 0 || height === 0) {
    console.error('Image width and height are required for YOLO format')
    return ''
  }

  let yoloData = ''

  predictions.forEach((pred) => {
    const [x, y, w, h] = pred.bbox
    
    // 转换为 YOLO 格式（归一化的中心坐标和宽高）
    const centerX = (x + w / 2) / width
    const centerY = (y + h / 2) / height
    const normWidth = w / width
    const normHeight = h / height
    const classId = getCategoryId(pred.class)

    yoloData += `${classId} ${centerX.toFixed(6)} ${centerY.toFixed(6)} ${normWidth.toFixed(6)} ${normHeight.toFixed(6)}\n`
  })

  return yoloData
}

// 辅助函数：获取类别 ID
const getCategoryId = (className) => {
  const categoryMap = {
    'person': 0,
    'bicycle': 1,
    'car': 2,
    'motorbike': 3,
    'aeroplane': 4,
    'bus': 5,
    'train': 6,
    'truck': 7,
    'boat': 8,
    'traffic light': 9
  }
  return categoryMap[className] || 0
}

// 辅助函数：获取 COCO 类别列表
const getCocoCategories = () => {
  return [
    { id: 1, name: 'person' },
    { id: 2, name: 'bicycle' },
    { id: 3, name: 'car' },
    { id: 4, name: 'motorbike' },
    { id: 5, name: 'aeroplane' },
    { id: 6, name: 'bus' },
    { id: 7, name: 'train' },
    { id: 8, name: 'truck' },
    { id: 9, name: 'boat' },
    { id: 10, name: 'traffic light' }
  ]
}

// 辅助函数：计算人物像素百分比
const calculatePersonPercentage = (segmentationData) => {
  const total = segmentationData.length
  const personPixels = Array.from(segmentationData).filter(val => val > 0).length
  return parseFloat(((personPixels / total) * 100).toFixed(2))
}

/**
 * 下载 JSON 数据
 */
export const downloadJSON = (data, fileName = 'annotations.json') => {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  downloadBlob(blob, fileName)
}

/**
 * 下载 XML 数据
 */
export const downloadXML = (xmlString, fileName = 'annotation.xml') => {
  const blob = new Blob([xmlString], { type: 'application/xml' })
  downloadBlob(blob, fileName)
}

/**
 * 下载 TXT 数据
 */
export const downloadTXT = (content, fileName = 'annotations.txt') => {
  const blob = new Blob([content], { type: 'text/plain' })
  downloadBlob(blob, fileName)
}

/**
 * 通用下载函数
 */
export const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 导出为 CSV 格式
 */
export const exportCSV = (predictions, imageInfo = {}) => {
  const { fileName = 'image.jpg' } = imageInfo

  let csv = 'File Name,Class,Confidence (%),X,Y,Width,Height,X2,Y2,Center X,Center Y\n'

  predictions.forEach((pred) => {
    const [x, y, w, h] = pred.bbox
    const confidence = (pred.score * 100).toFixed(2)
    const x2 = (x + w).toFixed(2)
    const y2 = (y + h).toFixed(2)
    const centerX = (x + w / 2).toFixed(2)
    const centerY = (y + h / 2).toFixed(2)

    csv += `${fileName},${pred.class},${confidence},${x.toFixed(2)},${y.toFixed(2)},${w.toFixed(2)},${h.toFixed(2)},${x2},${y2},${centerX},${centerY}\n`
  })

  return csv
}

export const downloadCSV = (predictions, imageInfo = {}, fileName = 'annotations.csv') => {
  const csv = exportCSV(predictions, imageInfo)
  const blob = new Blob([csv], { type: 'text/csv' })
  downloadBlob(blob, fileName)
}
