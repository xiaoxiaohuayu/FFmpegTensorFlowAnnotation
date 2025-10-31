<template>
  <div class="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <!-- <header class="mb-12">
        <h1 class="mb-2 text-4xl font-bold text-gray-900">
          🎬 视频标注工具
        </h1>
        <p class="text-lg text-gray-600">
          使用 FFmpeg.wasm + TensorFlow.js 实现浏览器端视频标注
        </p>
      </header> -->

      <!-- Main Content -->
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <!-- Left Panel: Controls -->
        <div class="lg:col-span-1">
          <div class="p-6 bg-white rounded-lg shadow-lg">
            <h2 class="mb-6 text-xl font-semibold text-gray-800">
              控制面板
            </h2>

            <!-- Video Upload -->
            <div class="mb-6">
              <label class="block mb-2 text-sm font-medium text-gray-700">
                选择视频或图片
              </label>
              <input
                type="file"
                accept="video/*,image/*"
                @change="handleFileSelect"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <!-- Detection Options -->
            <div class="mb-6 space-y-4">
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="detectPerson"
                  v-model="options.detectPerson"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <label for="detectPerson" class="ml-2 text-sm text-gray-700">
                  人物检测
                </label>
              </div>

              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="drawBoundingBox"
                  v-model="options.drawBoundingBox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <label for="drawBoundingBox" class="ml-2 text-sm text-gray-700">
                  显示边界框
                </label>
              </div>

              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="showConfidence"
                  v-model="options.showConfidence"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <label for="showConfidence" class="ml-2 text-sm text-gray-700">
                  显示置信度
                </label>
              </div>

              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="personContour"
                  v-model="options.personContour"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <label for="personContour" class="ml-2 text-sm text-gray-700">
                  人物描边
                </label>
              </div>

              <div v-if="options.personContour" class="ml-4 space-y-2">
                <label class="block text-xs font-medium text-gray-700">
                  描边颜色
                </label>
                <input
                  type="color"
                  v-model="options.contourColor"
                  class="w-full h-8 rounded cursor-pointer"
                />
              </div>

              <div v-if="options.personContour" class="ml-4 space-y-2">
                <label class="block text-xs font-medium text-gray-700">
                  描边透明度: {{ (options.contourOpacity * 100).toFixed(0) }}%
                </label>
                <input
                  type="range"
                  v-model="options.contourOpacity"
                  min="0"
                  max="1"
                  step="0.05"
                  class="w-full"
                />
              </div>

              <div v-if="options.personContour" class="ml-4 space-y-2">
                <label class="block text-xs font-medium text-gray-700">
                  描边宽度: {{ options.contourWidth }}px
                </label>
                <input
                  type="range"
                  v-model="options.contourWidth"
                  min="1"
                  max="10"
                  step="1"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="space-y-3">
              <button
                @click="handleProcess"
                :disabled="!fileSelected || isProcessing"
                class="w-full px-4 py-2 font-semibold text-white transition bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {{ isProcessing ? '处理中...' : '开始处理' }}
              </button>

              <button
                @click="downloadResult"
                :disabled="!hasResult"
                class="w-full px-4 py-2 font-semibold text-white transition bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                下载结果图片
              </button>

              <!-- Export Data Button -->
              <div v-if="hasResult && detectionData" class="relative">
                <button
                  @click="showExportMenu = !showExportMenu"
                  class="w-full px-4 py-2 font-semibold text-white transition bg-purple-600 rounded-lg hover:bg-purple-700"
                >
                  📊 导出标注数据
                </button>
                <div
                  v-if="showExportMenu"
                  class="absolute left-0 right-0 z-10 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg top-full"
                >
                  <button
                    @click="exportAsJSON"
                    class="w-full px-4 py-2 text-sm text-left text-gray-800 hover:bg-gray-100"
                  >
                    JSON 格式
                  </button>
                  <button
                    @click="exportAsCSV"
                    class="w-full px-4 py-2 text-sm text-left text-gray-800 border-t hover:bg-gray-100"
                  >
                    CSV 格式
                  </button>
                  <button
                    @click="exportAsYOLO"
                    class="w-full px-4 py-2 text-sm text-left text-gray-800 border-t hover:bg-gray-100"
                  >
                    YOLO 格式 (TXT)
                  </button>
                  <button
                    @click="exportAsVOC"
                    class="w-full px-4 py-2 text-sm text-left text-gray-800 border-t hover:bg-gray-100"
                  >
                    Pascal VOC 格式 (XML)
                  </button>
                  <button
                    @click="exportAsCOCO"
                    class="w-full px-4 py-2 text-sm text-left text-gray-800 border-t hover:bg-gray-100"
                  >
                    COCO 格式 (JSON)
                  </button>
                </div>
              </div>
            </div>

            <!-- Status Info -->
            <div class="p-4 mt-6 rounded-lg bg-gray-50">
              <h3 class="mb-2 text-sm font-semibold text-gray-800">
                处理状态
              </h3>
              <p class="text-sm text-gray-600">
                {{ status || '等待输入文件...' }}
              </p>
              <div v-if="progress > 0" class="mt-3">
                <div class="w-full h-2 bg-gray-200 rounded-full">
                  <div
                    class="h-2 transition-all duration-300 bg-blue-600 rounded-full"
                    :style="{ width: progress + '%' }"
                  ></div>
                </div>
                <p class="mt-1 text-xs text-gray-500">{{ progress }}%</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Preview -->
        <div class="lg:col-span-2">
          <div class="p-6 bg-white rounded-lg shadow-lg">
            <h2 class="mb-4 text-xl font-semibold text-gray-800">
              预览
            </h2>

            <!-- Video/Image Preview -->
            <div class="mb-6 overflow-hidden bg-black rounded-lg" style="aspect-ratio: 16/9">
              <div v-if="previewFile" class="flex items-center justify-center w-full h-full">
                <img
                  v-if="isImage(previewFile)"
                  :src="previewURL"
                  alt="preview"
                  class="object-contain w-full h-full"
                />
                <video
                  v-else
                  ref="videoPreview"
                  :src="previewURL"
                  class="object-contain w-full h-full"
                  controls
                ></video>
              </div>
              <div v-else class="flex items-center justify-center w-full h-full text-gray-500">
                <p>上传文件后显示预览</p>
              </div>
            </div>

            <!-- Result Preview -->
            <div v-if="resultURL" class="overflow-hidden rounded-lg" style="aspect-ratio: 16/9">
              <div v-if="isResultImage" class="flex items-center justify-center w-full h-full bg-black">
                <!-- 如果启用了描边且有分割数据，显示可交互的 canvas -->
                <canvas
                  v-if="options.personContour && originalImage"
                  ref="contourCanvas"
                  class="cursor-crosshair"
                  style="max-width: 100%; max-height: 100%; display: block; margin: auto;"
                  @mousedown="onCanvasMouseDown"
                  @mousemove="onCanvasMouseMove"
                  @mouseup="onCanvasMouseUp"
                  @mouseleave="onCanvasMouseUp"
                />
                <!-- 否则显示普通图片 -->
                <img
                  v-else
                  :src="resultURL"
                  alt="result"
                  class="object-contain w-full h-full"
                />
              </div>
              <video
                v-else
                :src="resultURL"
                class="object-contain w-full h-full bg-black rounded-lg"
                controls
              ></video>
            </div>

            <!-- Info Panel -->
            <div class="grid grid-cols-2 gap-4 mt-6">
              <div class="p-4 rounded-lg bg-blue-50">
                <p class="mb-1 text-xs text-gray-600">输入文件</p>
                <p class="text-sm font-semibold text-gray-900">
                  {{ fileName || '未选择' }}
                </p>
              </div>
              <div class="p-4 rounded-lg bg-green-50">
                <p class="mb-1 text-xs text-gray-600">检测结果</p>
                <p class="text-sm font-semibold text-gray-900">
                  {{ detectionCount }} 个对象
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { processImage, processVideo as processVideoFile } from './utils/videoProcessor'
import { exportDetectionData, downloadJSON, exportCOCOFormat, exportPascalVOC, exportYOLOFormat, downloadXML, downloadTXT, exportCSV, downloadCSV } from './utils/dataExporter'
import { drawPersonContour } from './utils/personSegmentation'

const fileSelected = ref(false)
const isProcessing = ref(false)
const hasResult = ref(false)
const previewFile = ref(null)
const previewURL = ref('')
const resultURL = ref('')
const resultBlob = ref(null)
const fileName = ref('')
const status = ref('')
const progress = ref(0)
const detectionCount = ref(0)
const isResultImage = ref(false)
const videoPreview = ref(null)
const detectionData = ref(null)
const imageWidth = ref(0)
const imageHeight = ref(0)
const showExportMenu = ref(false)
const contourCanvas = ref(null)
const originalImage = ref(null)
const contourPoints = ref([])
const isDragging = ref(false)
const draggedPoint = ref(null)
const contourPointRadius = ref(5)
const selectedPointIndex = ref(null)
const annotatedImage = ref(null)  // Cache the annotated image
const edgePointsData = ref(null)  // Store the actual edge points from segmentation

const options = ref({
  detectPerson: true,
  drawBoundingBox: true,
  showConfidence: true,
  personContour: false,
  contourColor: '#00FF00',
  contourOpacity: 0.5,
  contourWidth: 2,
  pointSampleInterval: 60  // 控制点采样间隔（像素）
})

const isImage = (file) => {
  return file.type.startsWith('image/')
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    previewFile.value = file
    fileName.value = file.name
    fileSelected.value = true
    previewURL.value = URL.createObjectURL(file)
    resultURL.value = ''
    resultBlob.value = null
    hasResult.value = false
    detectionCount.value = 0
    isResultImage.value = isImage(file)
  }
}

const handleProcess = async () => {
  if (!previewFile.value) return

  isProcessing.value = true
  progress.value = 0
  status.value = '初始化中...'
  showExportMenu.value = false

  try {
    let result
    
    if (isImage(previewFile.value)) {
      status.value = '处理图片中...'
      const processResult = await processImage(previewFile.value, {
        detectPerson: options.value.detectPerson,
        drawBoundingBox: options.value.drawBoundingBox,
        showConfidence: options.value.showConfidence,
        personContour: options.value.personContour,
        contourColor: options.value.contourColor,
        contourOpacity: options.value.contourOpacity,
        contourWidth: options.value.contourWidth
      })
      
      result = processResult.annotatedBlob
      detectionData.value = processResult.predictions
      imageWidth.value = processResult.width
      imageHeight.value = processResult.height
      edgePointsData.value = processResult.edgePoints  // Capture the edge points
      isResultImage.value = true
      detectionCount.value = processResult.predictions.length
      progress.value = 100
      status.value = '图片处理完成！'
      
      // 如果启用了描边，保存原始图像供描边 canvas 使用
      if (options.value.personContour) {
        originalImage.value = processResult.imageFile
      }
    } else {
      // Video processing
      const videoResult = await processVideoFile(previewFile.value, {
        detectPerson: options.value.detectPerson,
        drawBoundingBox: options.value.drawBoundingBox,
        showConfidence: options.value.showConfidence,
        personContour: options.value.personContour,
        contourColor: options.value.contourColor,
        contourOpacity: options.value.contourOpacity,
        contourWidth: options.value.contourWidth,
        fps: 1,
        outputFps: 30
      }, (progressData) => {
        progress.value = progressData.progress
        status.value = progressData.status
        if (progressData.detections !== undefined) {
          detectionCount.value = progressData.detections
        }
      })
      
      result = videoResult.blob
      detectionData.value = []
      isResultImage.value = false
    }

    resultBlob.value = result
    resultURL.value = URL.createObjectURL(result)
    hasResult.value = true
  } catch (error) {
    status.value = `错误: ${error.message}`
    console.error(error)
  } finally {
    isProcessing.value = false
  }
}

const downloadResult = () => {
  if (!resultBlob.value) return
  
  const link = document.createElement('a')
  link.href = resultURL.value
  const ext = isResultImage.value ? 'png' : 'mp4'
  link.download = `annotated_${Date.now()}.${ext}`
  link.click()
}

// 数据导出函数
const exportAsJSON = () => {
  if (!detectionData.value) return
  const data = exportDetectionData(detectionData.value, {
    fileName: fileName.value,
    width: imageWidth.value,
    height: imageHeight.value
  })
  downloadJSON(data, `${fileName.value.split('.')[0]}_annotations.json`)
  showExportMenu.value = false
}

const exportAsCSV = () => {
  if (!detectionData.value) return
  downloadCSV(detectionData.value, { fileName: fileName.value }, `${fileName.value.split('.')[0]}_annotations.csv`)
  showExportMenu.value = false
}

const exportAsYOLO = () => {
  if (!detectionData.value) return
  const yoloContent = exportYOLOFormat(detectionData.value, {
    width: imageWidth.value,
    height: imageHeight.value
  })
  downloadTXT(yoloContent, `${fileName.value.split('.')[0]}_annotations.txt`)
  showExportMenu.value = false
}

const exportAsVOC = () => {
  if (!detectionData.value) return
  const vocXML = exportPascalVOC(detectionData.value, {
    fileName: fileName.value,
    width: imageWidth.value,
    height: imageHeight.value
  })
  downloadXML(vocXML, `${fileName.value.split('.')[0]}_annotations.xml`)
  showExportMenu.value = false
}

const exportAsCOCO = () => {
  if (!detectionData.value) return
  const cocoData = exportCOCOFormat(detectionData.value, {
    fileName: fileName.value,
    width: imageWidth.value,
    height: imageHeight.value,
    imageId: 1
  })
  downloadJSON(cocoData, `${fileName.value.split('.')[0]}_coco_annotations.json`)
  showExportMenu.value = false
}

// Watch for personContour option changes and render canvas
watch([() => options.value.personContour, resultURL], async () => {
  if (options.value.personContour && resultURL.value && originalImage.value && contourCanvas.value && imageWidth.value && imageHeight.value) {
    await nextTick()
    
    const canvas = contourCanvas.value
    canvas.width = imageWidth.value
    canvas.height = imageHeight.value
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    console.log(originalImage.value,'originalImage.value')
    // Draw original image
    ctx.drawImage(originalImage.value, 0, 0, canvas.width, canvas.height)
    
    // Draw annotated image from resultURL
    const annotatedImg = new Image()
    annotatedImg.crossOrigin = 'anonymous'
    annotatedImg.onload = () => {
      ctx.drawImage(annotatedImg, 0, 0, canvas.width, canvas.height)
      // Cache the annotated image for later use
      annotatedImage.value = annotatedImg
      // Use edge points from segmentation if available
      if (edgePointsData.value && edgePointsData.value.length > 0) {
        sampleControlPoints(edgePointsData.value, options.value.pointSampleInterval)
      } else {
        console.warn('No edge points data - edge data should be captured during processing')
        contourPoints.value = []
      }
      // Draw control points
      drawControlPoints(ctx)
    }
    annotatedImg.src = resultURL.value
  }
})

// Extract contour points from the image data
const extractContourPoints = (ctx, width, height, sampleInterval = 60) => {
  // NO LONGER USE THIS - use sampleControlPoints instead
  console.warn('extractContourPoints deprecated - use sampleControlPoints with real edge data')
}

// Sample control points from edge points data
const sampleControlPoints = (edgePoints, sampleInterval = 60) => {
  if (!edgePoints || edgePoints.length === 0) {
    console.warn('No edge points to sample')
    contourPoints.value = []
    return
  }
  
  const points = []
  for (let i = 0; i < edgePoints.length; i += sampleInterval) {
    const point = edgePoints[i]
    points.push({
      x: point.x,
      y: point.y,
      originalX: point.x,
      originalY: point.y
    })
  }
  
  contourPoints.value = points
  console.log('Sampled', points.length, 'control points from', edgePoints.length, 'edge points with interval', sampleInterval)
}

// Draw control points on canvas
const drawControlPoints = (ctx) => {
  if (!contourPoints.value || contourPoints.value.length === 0) {
    return
  }
  
  const radius = 5
  
  contourPoints.value.forEach((point, index) => {
    ctx.beginPath()
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    ctx.closePath()
    
    if (index === selectedPointIndex.value) {
      // Highlight selected point
      ctx.fillStyle = '#FFFF00'
      ctx.fill()
      ctx.strokeStyle = '#FF0000'
      ctx.lineWidth = 2
      ctx.stroke()
    } else {
      // Normal control point
      ctx.fillStyle = '#FF0000'
      ctx.fill()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  })
}

// Canvas mouse events - Single point dragging with real-time redraw
const findNearestPoint = (x, y, threshold = 15) => {
  let nearest = -1
  let minDist = threshold
  
  contourPoints.value.forEach((point, index) => {
    const dist = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2)
    if (dist < minDist) {
      minDist = dist
      nearest = index
    }
  })
  
  return nearest
}

const onCanvasMouseDown = (e) => {
  const canvas = contourCanvas.value
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  // Find if clicked on a point
  const pointIndex = findNearestPoint(x, y)
  
  if (pointIndex >= 0) {
    // Clicked on a control point - start dragging
    isDragging.value = true
    selectedPointIndex.value = pointIndex
    draggedPoint.value = { pointIndex, startX: x, startY: y }
    console.log('Selected point:', pointIndex, 'at', contourPoints.value[pointIndex])
  }
}

const onCanvasMouseMove = (e) => {
  if (!isDragging.value || !draggedPoint.value || draggedPoint.value.pointIndex < 0) return
  
  const canvas = contourCanvas.value
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  // Calculate offset from start
  const offsetX = x - draggedPoint.value.startX
  const offsetY = y - draggedPoint.value.startY
  
  // Update the selected point position
  const pointIndex = draggedPoint.value.pointIndex
  contourPoints.value[pointIndex].x = contourPoints.value[pointIndex].originalX + offsetX
  contourPoints.value[pointIndex].y = contourPoints.value[pointIndex].originalY + offsetY
  
  console.log('Dragging point', pointIndex, 'to', contourPoints.value[pointIndex])
  
  // Redraw canvas immediately
  redrawCanvas()
}

const onCanvasMouseUp = () => {
  if (isDragging.value && draggedPoint.value && draggedPoint.value.pointIndex >= 0) {
    // Update original position to the new position
    const pointIndex = draggedPoint.value.pointIndex
    contourPoints.value[pointIndex].originalX = contourPoints.value[pointIndex].x
    contourPoints.value[pointIndex].originalY = contourPoints.value[pointIndex].y
    console.log('Point', pointIndex, 'finalized at', contourPoints.value[pointIndex])
  }
  
  isDragging.value = false
  draggedPoint.value = null
  selectedPointIndex.value = null
  
  // Final redraw
  redrawCanvas()
}

// Redraw canvas with current point positions
const redrawCanvas = () => {
  const canvas = contourCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx || !originalImage.value || !annotatedImage.value) return
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // Draw original image
  ctx.drawImage(originalImage.value, 0, 0, canvas.width, canvas.height)
  
  // Draw cached annotated image (with contour)
  ctx.drawImage(annotatedImage.value, 0, 0)
  
  // Draw control points on top
  drawControlPoints(ctx)
}


</script>

<style scoped>
/* Custom styles if needed */
</style>
