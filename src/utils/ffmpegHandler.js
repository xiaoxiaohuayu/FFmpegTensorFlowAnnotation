import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

const ffmpeg = new FFmpeg()

export const initFFmpeg = async () => {
  if (ffmpeg.isLoaded()) return
  
  try {
    await ffmpeg.load()
  } catch (error) {
    console.error('Failed to load FFmpeg:', error)
    throw error
  }
}

export const extractFrames = async (videoFile, options = {}) => {
  const { 
    fps = 1,
    startTime = 0,
    duration = null
  } = options

  if (!ffmpeg.isLoaded()) {
    await initFFmpeg()
  }

  const filename = videoFile.name || 'input.mp4'
  
  try {
    // Write input file to FFmpeg's virtual filesystem
    ffmpeg.FS('writeFile', filename, await fetchFile(videoFile))

    // Extract frames with specified fps
    let filterArgs = `fps=${fps}`
    if (duration) {
      filterArgs += `,scale=trunc(iw/2)*2:trunc(ih/2)*2`
    }

    await ffmpeg.run(
      '-i', filename,
      '-vf', `fps=${fps}`,
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      'frame_%03d.png'
    )

    // Read extracted frames
    const files = ffmpeg.FS('readdir', '/')
    const frames = []
    
    files.forEach(file => {
      if (file.startsWith('frame_') && file.endsWith('.png')) {
        const data = ffmpeg.FS('readFile', file)
        const blob = new Blob([data.buffer], { type: 'image/png' })
        frames.push(blob)
      }
    })

    return frames
  } catch (error) {
    console.error('Frame extraction error:', error)
    throw error
  }
}

export const extractVideoMetadata = async (videoFile) => {
  if (!ffmpeg.isLoaded()) {
    await initFFmpeg()
  }

  const filename = videoFile.name || 'input.mp4'
  
  try {
    ffmpeg.FS('writeFile', filename, await fetchFile(videoFile))

    // Use ffprobe equivalent through ffmpeg
    await ffmpeg.run('-i', filename)
    
    return {
      filename,
      size: videoFile.size,
      type: videoFile.type
    }
  } catch (error) {
    console.error('Metadata extraction error:', error)
    throw error
  }
}

export const createVideoFromFrames = async (frames, outputFilename = 'output.mp4', options = {}) => {
  const {
    fps = 30,
    width = 1280,
    height = 720,
    bitrate = '2000k'
  } = options

  if (!ffmpeg.isLoaded()) {
    await initFFmpeg()
  }

  try {
    // Write frames to virtual filesystem
    for (let i = 0; i < frames.length; i++) {
      const frameBlob = frames[i]
      const frameFilename = `frame_${String(i).padStart(3, '0')}.png`
      const arrayBuffer = await frameBlob.arrayBuffer()
      ffmpeg.FS('writeFile', frameFilename, new Uint8Array(arrayBuffer))
    }

    // Create video from frames
    await ffmpeg.run(
      '-framerate', fps.toString(),
      '-i', 'frame_%03d.png',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-b:v', bitrate,
      outputFilename
    )

    const data = ffmpeg.FS('readFile', outputFilename)
    const blob = new Blob([data.buffer], { type: 'video/mp4' })
    
    return blob
  } catch (error) {
    console.error('Video creation error:', error)
    throw error
  }
}

export const cleanFFmpegFS = () => {
  if (ffmpeg.isLoaded()) {
    try {
      const files = ffmpeg.FS('readdir', '/')
      files.forEach(file => {
        if (file !== '.' && file !== '..') {
          ffmpeg.FS('unlink', file)
        }
      })
    } catch (error) {
      console.error('Error cleaning FFmpeg filesystem:', error)
    }
  }
}

export const unloadFFmpeg = async () => {
  try {
    cleanFFmpegFS()
    if (ffmpeg.isLoaded()) {
      await ffmpeg.exit()
    }
  } catch (error) {
    console.error('Error unloading FFmpeg:', error)
  }
}
