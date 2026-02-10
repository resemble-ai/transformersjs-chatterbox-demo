import { SAMPLE_RATE } from './constants'

export async function recordAudio(durationMs = 10000) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
  const chunks = []

  return {
    mediaRecorder,
    stream,
    start() {
      chunks.length = 0
      mediaRecorder.start()
    },
    stop() {
      return new Promise((resolve) => {
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop())
          const blob = new Blob(chunks, { type: 'audio/webm' })
          const float32 = await blobToFloat32(blob)
          resolve(float32)
        }
        mediaRecorder.stop()
      })
    },
    getAnalyserNode() {
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      return { analyser, ctx }
    },
  }
}

export async function fileToFloat32(file) {
  const arrayBuffer = await file.arrayBuffer()
  const ctx = new OfflineAudioContext(1, 1, SAMPLE_RATE)
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  return resampleToTarget(audioBuffer)
}

async function blobToFloat32(blob) {
  const arrayBuffer = await blob.arrayBuffer()
  const ctx = new OfflineAudioContext(1, 1, SAMPLE_RATE)
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  return resampleToTarget(audioBuffer)
}

async function resampleToTarget(audioBuffer) {
  const numSamples = Math.round(audioBuffer.duration * SAMPLE_RATE)
  const offlineCtx = new OfflineAudioContext(1, numSamples, SAMPLE_RATE)
  const source = offlineCtx.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineCtx.destination)
  source.start()
  const resampled = await offlineCtx.startRendering()
  return resampled.getChannelData(0)
}
