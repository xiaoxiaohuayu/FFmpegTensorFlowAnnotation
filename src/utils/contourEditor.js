/**
 * 描边编辑工具
 * 支持在原图上绘制蒙版式描边，并允许拖动调整
 */

export class ContourEditor {
  constructor(canvasElement, imageData, segmentationData) {
    this.canvas = canvasElement
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })
    this.imageData = imageData
    this.segmentationData = segmentationData
    // 如果没有提供原始图像数据，创建空的
    if (imageData) {
      this.originalImageData = imageData;
    } else {
      this.originalImageData = this.ctx.createImageData(canvasElement.width, canvasElement.height);
    }
    
    this.contourColor = '#00FF00'
    this.contourWidth = 3
    this.contourOpacity = 0.5
    this.isDragging = false
    this.dragOffset = { x: 0, y: 0 }
    this.selectedPoint = null
    this.contourPoints = [] // 存储可拖动的控制点
    
    // 绑定方法到当前实例
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    
    this.initEventListeners()
  }

  /**
   * 初始化事件监听
   */
  initEventListeners() {
    // 先移除已有的监听器，避免重复绑定
    this.removeEventListeners();
    
    // 直接绑定方法，确保this指向正确
    this.canvas.addEventListener('mousedown', this.onMouseDown)
    this.canvas.addEventListener('mousemove', this.onMouseMove)
    this.canvas.addEventListener('mouseup', this.onMouseUp)
    this.canvas.addEventListener('mouseleave', this.onMouseLeave)
    
    console.log('ContourEditor: 事件监听器已初始化');
  }
  
  /**
   * 移除事件监听
   */
  removeEventListeners() {
    try {
      this.canvas.removeEventListener('mousedown', this.onMouseDown)
      this.canvas.removeEventListener('mousemove', this.onMouseMove)
      this.canvas.removeEventListener('mouseup', this.onMouseUp)
      this.canvas.removeEventListener('mouseleave', this.onMouseLeave)
    } catch (e) {
      // 忽略可能的错误，比如监听器尚未绑定
    }
  }

  /**
   * 绘制描边蒙版
   */
  drawContourMask(color = '#00FF00', opacity = 0.5, width = 3) {
    this.contourColor = color
    this.contourOpacity = opacity
    this.contourWidth = width

    // 恢复原始图像
    this.ctx.putImageData(this.originalImageData, 0, 0)

    const segmentationArray = this.segmentationData
    const canvasWidth = this.canvas.width
    const canvasHeight = this.canvas.height
    const segWidth = Math.sqrt(segmentationArray.length)
    const segHeight = segmentationArray.length / segWidth

    const scaleX = canvasWidth / segWidth
    const scaleY = canvasHeight / segHeight

    // 创建边缘掩膜
    const edgeImageData = this.ctx.createImageData(canvasWidth, canvasHeight)
    const edgeData = edgeImageData.data

    const rgb = this.hexToRgb(color)
    const alphaValue = Math.floor(255 * opacity)

    // 检测边界像素
    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        const srcX = Math.floor(x / scaleX)
        const srcY = Math.floor(y / scaleY)
        const srcIdx = srcY * segWidth + srcX
        const isForeground = segmentationArray[srcIdx] > 0

        let isEdge = false

        // 检查相邻像素
        for (let dy = -1; dy <= 1 && !isEdge; dy++) {
          for (let dx = -1; dx <= 1 && !isEdge; dx++) {
            if (dx === 0 && dy === 0) continue

            const nx = srcX + dx
            const ny = srcY + dy

            if (nx < 0 || nx >= segWidth || ny < 0 || ny >= segHeight) {
              isEdge = isForeground
            } else {
              const nidx = ny * segWidth + nx
              if ((segmentationArray[nidx] > 0) !== isForeground) {
                isEdge = true
              }
            }
          }
        }

        const idx = (y * canvasWidth + x) * 4
        if (isEdge) {
          edgeData[idx] = rgb.r
          edgeData[idx + 1] = rgb.g
          edgeData[idx + 2] = rgb.b
          edgeData[idx + 3] = alphaValue
        }
      }
    }

    this.ctx.putImageData(edgeImageData, 0, 0)
  }

  /**
   * 提取边界点用于拖动
   */
  extractContourPoints() {
    const segmentationArray = this.segmentationData
    const canvasWidth = this.canvas.width
    const canvasHeight = this.canvas.height
    const segWidth = Math.sqrt(segmentationArray.length)
    const segHeight = segmentationArray.length / segWidth

    const scaleX = canvasWidth / segWidth
    const scaleY = canvasHeight / segHeight

    const points = []

    // 采样边界点（每N个像素采样一个）
    const sampleRate = 5
    for (let y = 0; y < segHeight; y += sampleRate) {
      for (let x = 0; x < segWidth; x += sampleRate) {
        const idx = y * segWidth + x
        const isForeground = segmentationArray[idx] > 0

        let isEdge = false
        for (let dy = -1; dy <= 1 && !isEdge; dy++) {
          for (let dx = -1; dx <= 1 && !isEdge; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || nx >= segWidth || ny < 0 || ny >= segHeight) {
              isEdge = isForeground
            } else {
              const nidx = ny * segWidth + nx
              if ((segmentationArray[nidx] > 0) !== isForeground) {
                isEdge = true
              }
            }
          }
        }

        if (isEdge) {
          points.push({
            x: x * scaleX,
            y: y * scaleY,
            originalX: x,
            originalY: y
          })
        }
      }
    }

    this.contourPoints = points
    return points
  }

  /**
   * 绘制可拖动的控制点
   */
  drawControlPoints(radius = 5) {
    this.ctx.fillStyle = '#FF0000'
    this.ctx.globalAlpha = 0.8
    
    this.contourPoints.forEach(point => {
      this.ctx.beginPath()
      this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
      this.ctx.fill()
    })
    
    this.ctx.globalAlpha = 1.0
  }

  /**
   * 查找最近的控制点
   */
  findNearestPoint(x, y, threshold = 15) { // 增大阈值，更容易找到控制点
    let nearest = null
    let minDist = threshold

    this.contourPoints.forEach(point => {
      const dist = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2)
      if (dist < minDist) {
        minDist = dist
        nearest = point
      }
    })

    return nearest
  }

  /**
   * 鼠标按下事件
   */
  onMouseDown(e) {
    console.log('ContourEditor: 鼠标按下');
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const nearest = this.findNearestPoint(x, y)
    if (nearest) {
      console.log('ContourEditor: 找到了控制点，开始拖拽');
      this.isDragging = true
      this.dragOffset.x = x - nearest.x
      this.dragOffset.y = y - nearest.y
      this.selectedPoint = nearest
    }
  }

  /**
   * 鼠标移动事件
   */
  onMouseMove(e) {
    if (this.isDragging && this.selectedPoint) {
      console.log('ContourEditor: 鼠标移动，拖拽中');
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // 更新点的位置
      this.selectedPoint.x = x - this.dragOffset.x
      this.selectedPoint.y = y - this.dragOffset.y

      // 重新绘制
      this.redraw()
    }
  }

  /**
   * 鼠标释放事件
   */
  onMouseUp(e) {
    console.log('ContourEditor: 鼠标释放');
    this.isDragging = false
    this.selectedPoint = null
  }

  /**
   * 鼠标离开事件
   */
  onMouseLeave(e) {
    console.log('ContourEditor: 鼠标离开');
    this.isDragging = false
    this.selectedPoint = null
  }

  /**
   * 重新绘制
   */
  redraw() {
    // 恢复原始图像
    this.ctx.putImageData(this.originalImageData, 0, 0)
    
    // 重新绘制描边
    this.drawContourMask(this.contourColor, this.contourOpacity, this.contourWidth)
    
    // 绘制控制点
    this.drawControlPoints()
  }

  /**
   * 隐藏控制点
   */
  hideControlPoints() {
    this.redraw()
  }

  /**
   * 导出编辑后的图像
   */
  exportImage(format = 'image/png') {
    return new Promise(resolve => {
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = this.canvas.width
      tempCanvas.height = this.canvas.height
      const tempCtx = tempCanvas.getContext('2d')

      // 复制原始图像
      tempCtx.putImageData(this.originalImageData, 0, 0)

      // 绘制描边（不包括控制点）
      const edgeImageData = this.ctx.createImageData(this.canvas.width, this.canvas.height)
      const edgeData = edgeImageData.data

      const rgb = this.hexToRgb(this.contourColor)
      const alphaValue = Math.floor(255 * this.contourOpacity)

      // 复制当前描边
      const currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
      const currentData = currentImageData.data

      for (let i = 0; i < currentData.length; i += 4) {
        if (currentData[i + 3] > 0) { // 如果有像素
          edgeData[i] = currentData[i]
          edgeData[i + 1] = currentData[i + 1]
          edgeData[i + 2] = currentData[i + 2]
          edgeData[i + 3] = currentData[i + 3]
        }
      }

      tempCtx.putImageData(edgeImageData, 0, 0)
      tempCanvas.toBlob(resolve, format)
    })
  }

  /**
   * 辅助函数：十六进制转RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 255, b: 0 }
  }

  /**
   * 销毁编辑器
   */
  destroy() {
    this.canvas.removeEventListener('mousedown', (e) => this.onMouseDown(e))
    this.canvas.removeEventListener('mousemove', (e) => this.onMouseMove(e))
    this.canvas.removeEventListener('mouseup', (e) => this.onMouseUp(e))
    this.canvas.removeEventListener('mouseleave', (e) => this.onMouseLeave(e))
  }
}

/**
 * 快速创建描边编辑器
 */
export const createContourEditor = (canvasElement, imageData, segmentationData) => {
  return new ContourEditor(canvasElement, imageData, segmentationData)
}
