import { detectObjects, filterPersonDetections, drawDetections, initModel } from './tensorflowDetector'
import { extractFrames, createVideoFromFrames, cleanFFmpegFS, initFFmpeg } from './ffmpegHandler'
import { initSegmentationModel, segmentPerson, drawPersonContour, unloadSegmentationModel } from './personSegmentation'

export const processImage = async (imageFile, options = {}) => {
  const { detectPerson = true, drawBoundingBox = true, showConfidence = true, personContour = false, contourColor = '#00FF00', contourOpacity = 0.5, contourWidth = 2 } = options

  try {
    // Load image
    const img = new Image()
    img.src = URL.createObjectURL(imageFile)
    
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })

    // Initialize model
    await initModel()

    let predictions = []
    let segmentationData = null

    // Detect objects if bounding box is enabled OR if we need data for other purposes
    if (drawBoundingBox) {
      predictions = await detectObjects(img)
      
      if (detectPerson) {
        predictions = filterPersonDetections(predictions)
      }
    }

    // Get person segmentation if contour is enabled
    if (personContour) {
      await initSegmentationModel()
      segmentationData = await segmentPerson(img)
    }

    // Create original image blob (for display)
    const originalBlob = await new Promise(resolve => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(resolve, 'image/png')
    })

    // Create annotated image blob (with bounding boxes)
    let annotatedBlob = originalBlob
    let edgePoints = null
    if ((drawBoundingBox && predictions.length > 0) || personContour) {
      annotatedBlob = await new Promise(resolve => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        
        // Draw bounding boxes if enabled and predictions exist
        if (drawBoundingBox && predictions.length > 0) {
          drawDetections(canvas, predictions, {
            drawBoundingBox: true,
            showConfidence,
            showLabel: true
          })
        }
        
        // Draw person contour if enabled - capture the returned edge points
        if (personContour && segmentationData) {
          edgePoints = drawPersonContour(canvas, segmentationData, {
            contourColor,
            contourWidth,
            opacity: contourOpacity
          })
        }
        
        canvas.toBlob(resolve, 'image/png')
      })
    }

    return {
      originalBlob,
      annotatedBlob,
      predictions,
      segmentation: segmentationData,
      edgePoints,  // Return the edge points for control point extraction
      width: img.width,
      height: img.height,
      imageFile: img
    }
  } catch (error) {
    console.error('Image processing error:', error)
    throw error
  }
}

export const processVideo = async (videoFile, options = {}, onProgress = null) => {
  const {
    detectPerson = true,
    drawBoundingBox = true,
    showConfidence = true,
    personContour = false,
    contourColor = '#00FF00',
    contourOpacity = 0.5,
    contourWidth = 2,
    fps = 1,
    outputFps = 30
  } = options

  try {
    // Initialize FFmpeg
    await initFFmpeg()
    
    // Report progress
    if (onProgress) onProgress({ status: 'Extracting frames...', progress: 10 })

    // Extract frames
    const frames = await extractFrames(videoFile, { fps })
    const totalFrames = frames.length

    // Initialize model
    await initModel()
    
    if (personContour) {
      await initSegmentationModel()
    }
    
    if (onProgress) onProgress({ status: 'Initializing detection model...', progress: 20 })

    // Process each frame
    const annotatedFrames = []
    
    for (let i = 0; i < totalFrames; i++) {
      if (onProgress) {
        const progress = 20 + (i / totalFrames) * 70
        onProgress({ 
          status: `Processing frame ${i + 1}/${totalFrames}...`, 
          progress: Math.round(progress),
          detections: 0
        })
      }

      // Load frame image
      const frameImg = new Image()
      frameImg.src = URL.createObjectURL(frames[i])
      
      await new Promise((resolve, reject) => {
        frameImg.onload = resolve
        frameImg.onerror = reject
      })

      // Detect objects
      let predictions = await detectObjects(frameImg)
      
      // Filter person detections
      if (detectPerson) {
        predictions = filterPersonDetections(predictions)
      }

      // Create canvas and draw annotations
      const canvas = document.createElement('canvas')
      canvas.width = frameImg.width
      canvas.height = frameImg.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(frameImg, 0, 0)

      if (drawBoundingBox && predictions.length > 0) {
        drawDetections(canvas, predictions, {
          drawBoundingBox,
          showConfidence,
          showLabel: true
        })
      }

      // Draw person contour if enabled
      if (personContour) {
        const segmentation = await segmentPerson(frameImg)
        drawPersonContour(canvas, segmentation, {
          contourColor,
          contourWidth,
          opacity: contourOpacity
        })
      }

      // Convert to blob
      const annotatedBlob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png')
      })
      annotatedFrames.push(annotatedBlob)
    }

    if (onProgress) onProgress({ status: 'Creating video...', progress: 90 })

    // Create video from annotated frames
    const videoBlob = await createVideoFromFrames(annotatedFrames, 'output.mp4', {
      fps: outputFps,
      bitrate: '2000k'
    })

    if (onProgress) onProgress({ status: 'Complete!', progress: 100 })

    // Clean up
    cleanFFmpegFS()

    return {
      blob: videoBlob,
      detections: totalFrames
    }
  } catch (error) {
    console.error('Video processing error:', error)
    if (onProgress) onProgress({ status: `Error: ${error.message}`, progress: 0 })
    throw error
  }
}
