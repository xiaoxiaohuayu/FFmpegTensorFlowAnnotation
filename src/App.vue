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
              
              <div v-if="options.personContour" class="ml-4 space-y-2">
                <label class="block text-xs font-medium text-gray-700">
                  轮廓点精简: {{ options.pointSampleInterval }}px (当前点数量: {{ controlPoints.length }})
                </label>
                <input
                  type="range"
                  v-model.number="options.pointSampleInterval"
                  min="10"
                  max="200"
                  step="10"
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
            <div v-if="resultURL" class="overflow-hidden rounded-lg" style="aspect-ratio: 16/9; position: relative;">
              <!-- 全屏按钮 -->
              <button 
                @click="toggleFullscreen" 
                class="absolute top-4 right-4 z-20 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition"
                title="全屏/退出全屏"
              >
                {{ isFullscreen ? '⤦' : '⤢' }}
              </button>
              
              <!-- 全屏容器 -->
              <div 
                ref="fullscreenContainer" 
                v-if="isResultImage" 
                class="flex items-center justify-center w-full h-full bg-black relative"
              >
                <!-- 如果启用了描边且有分割数据，显示可交互的 canvas -->
                <canvas
                  v-if="options.personContour && originalImage"
                  ref="contourCanvas"
                  @mousedown="handleCanvasMouseDown"
                  @mousemove="handleCanvasMouseMove"
                  @mouseup="handleCanvasMouseUp"
                  @mouseleave="handleCanvasMouseUp"
                  class="cursor-crosshair"
                  style="max-width: 100%; max-height: 100%; display: block; margin: auto; touch-action: none;"
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
import { ref, watch, nextTick, onMounted } from 'vue'
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
const annotatedImage = ref(null)  // Cache the annotated image
const edgePointsData = ref(null)  // Store the actual edge points from segmentation
const fullscreenContainer = ref(null)
const isFullscreen = ref(false)  // 跟踪全屏状态

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

const downloadResult = async () => {
  if (!resultBlob.value) return
  
  if (isResultImage.value && options.value.personContour && contourCanvas.value) {
    // 如果启用了轮廓编辑，导出编辑后的图像
    try {
      const canvas = contourCanvas.value
      const dataURL = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = dataURL
      link.download = `annotated_edited_${Date.now()}.png`
      link.click()
      // 清理URL对象
      setTimeout(() => URL.revokeObjectURL(link.href), 100)
    } catch (error) {
      console.error('导出编辑后的图像失败:', error)
      // 回退到原始导出
      exportOriginalResult()
    }
  } else {
    exportOriginalResult()
  }
}

// 导出原始处理结果
const exportOriginalResult = () => {
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

// 拖拽相关状态和函数 - 简化实现
const isDragging = ref(false)
const dragIndex = ref(-1)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)
const controlPoints = ref([])

// 获取鼠标在canvas中的坐标 - 考虑缩放比例
const getMousePos = (canvas, e) => {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  }
}

// 查找距离指定坐标最近的控制点
const findNearbyPoint = (x, y, tolerance = 30) => {
  console.log(`查找最近控制点 - 位置: (${x}, ${y}), 阈值: ${tolerance}`)
  let minDist = tolerance
  let closestIndex = -1
  
  controlPoints.value.forEach((point, index) => {
    const dist = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2)
    if (dist < minDist) {
      minDist = dist
      closestIndex = index
    }
  })
  
  console.log(closestIndex !== -1 ? 
    `找到最近控制点: 索引=${closestIndex}, 距离=${minDist.toFixed(2)}` : 
    '未找到控制点')
  
  return closestIndex
}

// 根据采样间隔精简轮廓点
const simplifyControlPoints = (points, interval) => {
  if (!points || points.length <= 2) {
    console.log(`无需精简: 只有${points?.length || 0}个点`)
    return points ? [...points] : []
  }
  
  // 计算总长度
  let totalLength = 0
  const segmentLengths = []
  
  // 计算每个线段的长度
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i+1].x - points[i].x
    const dy = points[i+1].y - points[i].y
    const length = Math.sqrt(dx * dx + dy * dy)
    segmentLengths.push(length)
    totalLength += length
  }
  
  // 计算总点数
  const newPoints = [points[0]] // 总是保留第一个点
  let accumulatedLength = 0
  let currentInterval = interval
  
  for (let i = 0; i < points.length - 1; i++) {
    const segmentLength = segmentLengths[i]
    
    // 如果当前线段长度超过剩余需要的长度
    while (segmentLength > currentInterval - accumulatedLength) {
      // 在线段上找到合适的点
      const ratio = (currentInterval - accumulatedLength) / segmentLength
      const x = points[i].x + (points[i+1].x - points[i].x) * ratio
      const y = points[i].y + (points[i+1].y - points[i].y) * ratio
      
      newPoints.push({ x, y })
      accumulatedLength = 0
      currentInterval += interval
    }
    
    accumulatedLength += segmentLength
  }
  
  // 确保包含最后一个点
  if (newPoints.length > 0 && 
      (newPoints[newPoints.length - 1].x !== points[points.length - 1].x || 
       newPoints[newPoints.length - 1].y !== points[points.length - 1].y)) {
    newPoints.push(points[points.length - 1])
  }
  
  console.log(`精简完成: 从${points.length}个点精简到${newPoints.length}个点, 采样间隔:${interval}px`)
  return newPoints
};

// 绘制整个画布
const drawCanvas = () => {
  const canvas = contourCanvas.value
  if (!canvas || !originalImage.value || controlPoints.value.length === 0) {
    console.log('无法渲染canvas: 缺少必要元素')
    return
  }
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 绘制原始图像
  ctx.drawImage(originalImage.value, 0, 0, canvas.width, canvas.height)
  
  // 绘制控制点（先绘制控制点，后绘制连线）
  ctx.fillStyle = '#FF0000'
  controlPoints.value.forEach(point => {
    ctx.beginPath()
    ctx.arc(point.x, point.y, 10, 0, Math.PI * 2)  // 10像素大小便于点击
    ctx.fill()
    // 添加白色边框使控制点更明显
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()
  })
  
  // 绘制轮廓线
  if (controlPoints.value.length > 1) {
    ctx.strokeStyle = options.value.contourColor
    ctx.globalAlpha = options.value.contourOpacity
    ctx.lineWidth = options.value.contourWidth
    ctx.beginPath()
    
    const points = controlPoints.value
    const len = points.length
    
    console.log(`开始绘制轮廓线，控制点数量: ${len}`)
    
    // 使用贝塞尔曲线绘制平滑轮廓
    // 从第一个点开始
    ctx.moveTo(points[0].x, points[0].y)
    console.log(`起点: (${points[0].x}, ${points[0].y})`)
    
    // 如果只有两个点，使用直线连接
    if (len === 2) {
      ctx.lineTo(points[1].x, points[1].y)
      console.log(`只有两个点，使用直线连接到点2: (${points[1].x}, ${points[1].y})`)
    } else {
      // 使用三次贝塞尔曲线连接所有点
      for (let i = 0; i < len; i++) {
        const current = points[i]
        const next = points[(i + 1) % len]
        const nextNext = points[(i + 2) % len]
        
        // 计算控制点
        const cpx = current.x + (next.x - current.x) * 0.33
        const cpy = current.y + (next.y - current.y) * 0.33
        const cpx2 = next.x - (nextNext.x - next.x) * 0.33
        const cpy2 = next.y - (nextNext.y - next.y) * 0.33
        
        // 使用三次贝塞尔曲线连接
        ctx.bezierCurveTo(cpx, cpy, cpx2, cpy2, next.x, next.y)
        console.log(`使用贝塞尔曲线连接到点${(i + 1) % len + 1}: (${next.x}, ${next.y})`)
      }
    }
    
    ctx.stroke()
    ctx.globalAlpha = 1.0
  }
  
  console.log(`Canvas渲染完成 - ${controlPoints.value.length}个控制点`)
}

// 鼠标按下事件处理
const handleCanvasMouseDown = (e) => {
  console.log('鼠标按下事件触发!')
  const canvas = contourCanvas.value
  if (!canvas || controlPoints.value.length === 0) {
    console.log('无法拖拽: canvas不存在或没有控制点')
    return
  }
  
  e.preventDefault()
  e.stopPropagation()
  
  const pos = getMousePos(canvas, e)
  console.log(`鼠标按下位置: (${pos.x}, ${pos.y})`)
  
  const index = findNearbyPoint(pos.x, pos.y)
  if (index !== -1) {
    isDragging.value = true
    dragIndex.value = index
    dragOffsetX.value = pos.x - controlPoints.value[index].x
    dragOffsetY.value = pos.y - controlPoints.value[index].y
    canvas.style.cursor = 'grabbing'
    console.log(`开始拖拽控制点 ${index}`)
    
    // 高亮显示正在拖拽的控制点
    drawCanvas()
  }
}

// 鼠标移动事件处理
const handleCanvasMouseMove = (e) => {
  const canvas = contourCanvas.value
  if (!canvas) return
  
  if (isDragging.value && dragIndex.value !== -1) {
    e.preventDefault()
    e.stopPropagation()
    
    const pos = getMousePos(canvas, e)
    
    // 更新控制点位置
    controlPoints.value[dragIndex.value].x = pos.x - dragOffsetX.value
    controlPoints.value[dragIndex.value].y = pos.y - dragOffsetY.value
    
    console.log(`移动控制点 ${dragIndex.value} 到: (${controlPoints.value[dragIndex.value].x.toFixed(1)}, ${controlPoints.value[dragIndex.value].y.toFixed(1)})`)
    
    // 重新渲染
    drawCanvas()
  } else {
    // 检查鼠标是否悬停在控制点上，改变光标样式
    const pos = getMousePos(canvas, e)
    const index = findNearbyPoint(pos.x, pos.y)
    if (index !== -1) {
      canvas.style.cursor = 'grab'
    } else {
      canvas.style.cursor = 'crosshair'
    }
  }
}

// 按照角度对点进行排序，使它们按照顺时针方向围绕中心点排列
const sortPointsByAngle = (points) => {
  // 计算中心点
  const center = points.reduce((acc, point) => {
    acc.x += point.x / points.length
    acc.y += point.y / points.length
    return acc
  }, { x: 0, y: 0 })
  
  // 按照相对于中心点的角度排序
  return points.sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x)
    const angleB = Math.atan2(b.y - center.y, b.x - center.x)
    return angleA - angleB // 顺时针排序
  })
}

// 鼠标释放事件处理
const handleCanvasMouseUp = (e) => {
  console.log('鼠标释放事件触发!')
  const canvas = contourCanvas.value
  if (!canvas) return
  
  e.preventDefault()
  e.stopPropagation()
  
  if (isDragging.value) {
    isDragging.value = false
    dragIndex.value = -1
    canvas.style.cursor = 'crosshair'
    console.log('拖拽结束')
  }
}

// Watch for personContour option changes and render canvas
watch([() => options.value.personContour, resultURL], async () => {
  if (options.value.personContour && resultURL.value && originalImage.value && contourCanvas.value && imageWidth.value && imageHeight.value) {
    await nextTick()
    
    const canvas = contourCanvas.value
    if (!canvas) {
      console.error('Canvas元素不存在')
      return
    }
    
    // 设置canvas尺寸
    canvas.width = imageWidth.value
    canvas.height = imageHeight.value
    
    // 重置拖拽状态
    isDragging.value = false
    dragIndex.value = -1
    dragOffsetX.value = 0
    dragOffsetY.value = 0
    
    // 检查并处理边缘点数据
    console.log('检查边缘点数据...')
    if (edgePointsData.value && edgePointsData.value.length > 0) {
      console.log(`发现 ${edgePointsData.value.length} 个边缘点`)
      
      // 复制边缘点数据并根据采样间隔精简
      const rawPoints = edgePointsData.value.map(point => ({
        x: point.x,
        y: point.y
      }))
      
      // 应用精简逻辑
      let simplifiedPoints = simplifyControlPoints(rawPoints, options.value.pointSampleInterval)
      
      // 对控制点进行排序，使其按照顺时针方向围绕对象排列
      if (simplifiedPoints.length > 2) {
        simplifiedPoints = sortPointsByAngle(simplifiedPoints)
        console.log('控制点已排序为顺时针方向')
      }
      
      controlPoints.value = simplifiedPoints
      
      console.log('控制点已初始化、精简并排序:', controlPoints.value.length, '个点')
      
      // 初始渲染
      drawCanvas()
    } else {
      console.log('没有找到边缘点数据')
    }
    
    // 缓存带注释的图像用于参考
    const annotatedImg = new Image()
    annotatedImg.crossOrigin = 'anonymous'
    annotatedImg.onload = () => {
      annotatedImage.value = annotatedImg
    }
    annotatedImg.src = resultURL.value
  }
})

// 监听参数变化，实时更新
watch(
  () => [options.value.contourColor, options.value.contourOpacity, options.value.contourWidth, options.value.pointSampleInterval],
  (newValues, oldValues) => {
    if (options.value.personContour && controlPoints.value.length > 0) {
      // 检查是否是采样间隔变化
      const [, , , newInterval] = newValues
      const [, , , oldInterval] = oldValues
      
      if (oldInterval !== undefined && newInterval !== undefined && newInterval !== oldInterval && edgePointsData.value) {
        // 如果是采样间隔变化，重新精简控制点
        console.log(`采样间隔变化: ${oldInterval}px -> ${newInterval}px，重新精简控制点`)
        const rawPoints = edgePointsData.value.map(point => ({
          x: point.x,
          y: point.y
        }))
        let simplifiedPoints = simplifyControlPoints(rawPoints, newInterval)
        
        // 对控制点进行排序，使其按照顺时针方向围绕对象排列
        if (simplifiedPoints.length > 2) {
          simplifiedPoints = sortPointsByAngle(simplifiedPoints)
          console.log('控制点已排序为顺时针方向')
        }
        
        controlPoints.value = simplifiedPoints
      }
      
      console.log('参数变化，重新渲染canvas')
      drawCanvas()
    }
  }
)

// 全屏切换功能
const toggleFullscreen = async () => {
  const container = fullscreenContainer.value;
  if (!container) return;

  try {
    if (!isFullscreen.value) {
      // 进入全屏
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) { /* Safari */
        await container.webkitRequestFullscreen();
      } else if (container.msRequestFullscreen) { /* IE11 */
        await container.msRequestFullscreen();
      }
      isFullscreen.value = true;
      
      // 监听全屏状态变化
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('MSFullscreenChange', handleFullscreenChange);
      
      // 重新绘制canvas以适应全屏
      setTimeout(() => {
        wrappedDrawCanvas();
      }, 100);
    } else {
      // 退出全屏
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { /* Safari */
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE11 */
        await document.msExitFullscreen();
      }
    }
  } catch (err) {
    console.error('全屏切换失败:', err);
  }
}

// 处理全屏状态变化
const handleFullscreenChange = () => {
  const isCurrentlyFullscreen = !!(document.fullscreenElement || 
                                  document.webkitFullscreenElement || 
                                  document.msFullscreenElement);
    
  isFullscreen.value = isCurrentlyFullscreen;
    
  // 如果退出全屏，重新绘制canvas
  if (!isCurrentlyFullscreen) {
    setTimeout(() => {
      wrappedDrawCanvas();
    }, 100);
    
    // 移除事件监听器
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
  }
}

// 创建一个响应式的绘制函数引用
const activeDrawCanvas = ref(drawCanvas);

// 增强版的drawCanvas函数
const enhancedDrawCanvas = function() {
  const canvas = contourCanvas.value;
  if (!canvas) return;
  
  // 检查是否处于全屏模式
  const isCurrentlyFullscreen = !!(document.fullscreenElement || 
                                  document.webkitFullscreenElement || 
                                  document.msFullscreenElement);
  
  if (isCurrentlyFullscreen && fullscreenContainer.value) {
    // 全屏模式下，调整canvas尺寸以适应全屏容器
    const container = fullscreenContainer.value;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // 计算等比例缩放因子
    // 这里我们直接使用容器尺寸作为canvas尺寸，因为我们会在绘制时保持原始比例
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    
    // 计算图像在全屏canvas中的居中位置和等比例尺寸
    const ctx = canvas.getContext('2d');
    if (!ctx || !originalImage.value || controlPoints.value.length === 0) return;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算等比例缩放因子
    const ratio = Math.min(
      containerWidth / imageWidth.value,
      containerHeight / imageHeight.value
    );
    
    const scaledWidth = Math.floor(imageWidth.value * ratio);
    const scaledHeight = Math.floor(imageHeight.value * ratio);
    
    // 计算居中位置
    const x = Math.floor((containerWidth - scaledWidth) / 2);
    const y = Math.floor((containerHeight - scaledHeight) / 2);
    
    // 绘制原始图像，保持比例并居中
    ctx.drawImage(originalImage.value, x, y, scaledWidth, scaledHeight);
    
    // 绘制控制点（需要根据缩放比例调整坐标）
    ctx.fillStyle = '#FF0000';
    controlPoints.value.forEach(point => {
      // 计算缩放后的坐标，并加上偏移量
      const scaledX = x + (point.x / imageWidth.value) * scaledWidth;
      const scaledY = y + (point.y / imageHeight.value) * scaledHeight;
      
      ctx.beginPath();
      ctx.arc(scaledX, scaledY, 10, 0, Math.PI * 2);
      ctx.fill();
      // 添加白色边框使控制点更明显
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    
    // 绘制轮廓线（需要根据缩放比例调整坐标）
    if (controlPoints.value.length > 1) {
      ctx.strokeStyle = options.value.contourColor;
      ctx.globalAlpha = options.value.contourOpacity;
      ctx.lineWidth = options.value.contourWidth;
      ctx.beginPath();
      
      // 从第一个缩放后的点开始
      const firstPoint = controlPoints.value[0];
      const startX = x + (firstPoint.x / imageWidth.value) * scaledWidth;
      const startY = y + (firstPoint.y / imageHeight.value) * scaledHeight;
      ctx.moveTo(startX, startY);
      
      // 如果只有两个点，使用直线连接
      if (controlPoints.value.length === 2) {
        const secondPoint = controlPoints.value[1];
        const endX = x + (secondPoint.x / imageWidth.value) * scaledWidth;
        const endY = y + (secondPoint.y / imageHeight.value) * scaledHeight;
        ctx.lineTo(endX, endY);
      } else {
        // 使用贝塞尔曲线绘制平滑轮廓（需要调整所有点的坐标）
        for (let i = 1; i < controlPoints.value.length - 1; i++) {
          const p0 = controlPoints.value[i - 1];
          const p1 = controlPoints.value[i];
          const p2 = controlPoints.value[i + 1];
          
          // 计算缩放后的控制点坐标
          const x0 = x + (p0.x / imageWidth.value) * scaledWidth;
          const y0 = y + (p0.y / imageHeight.value) * scaledHeight;
          const x1 = x + (p1.x / imageWidth.value) * scaledWidth;
          const y1 = y + (p1.y / imageHeight.value) * scaledHeight;
          const x2 = x + (p2.x / imageWidth.value) * scaledWidth;
          const y2 = y + (p2.y / imageHeight.value) * scaledHeight;
          
          // 计算贝塞尔曲线的控制点
          const cp1x = x1 - (x2 - x0) / 6;
          const cp1y = y1 - (y2 - y0) / 6;
          const cp2x = x1 + (x2 - x0) / 6;
          const cp2y = y1 + (y2 - y0) / 6;
          
          // 绘制三次贝塞尔曲线
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        }
        
        // 连接最后一个点
        const lastPoint = controlPoints.value[controlPoints.value.length - 1];
        const lastX = x + (lastPoint.x / imageWidth.value) * scaledWidth;
        const lastY = y + (lastPoint.y / imageHeight.value) * scaledHeight;
        ctx.lineTo(lastX, lastY);
      }
      
      ctx.stroke();
    }
  } else {
    // 非全屏模式下，恢复原始尺寸
    // 恢复canvas的原始尺寸属性和CSS样式
    canvas.width = imageWidth.value;
    canvas.height = imageHeight.value;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    
    // 直接调用原始的drawCanvas函数
    drawCanvas();
  }
}

// 替换所有调用点使用的函数
const wrappedDrawCanvas = function() {
  enhancedDrawCanvas();
}

// 确保canvas在组件挂载后正确初始化
onMounted(() => {
  console.log('组件已挂载，拖拽功能准备就绪')
})

</script>

<style scoped>
/* Custom styles if needed */
</style>
