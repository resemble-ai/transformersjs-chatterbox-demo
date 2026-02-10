import { SAMPLE_RATE } from './constants'

export function createAudioPlayer() {
  let audioCtx = null
  let sourceNode = null
  let startTime = 0
  let pauseOffset = 0
  let currentBuffer = null
  let isPlaying = false
  let onTimeUpdate = null
  let onEnded = null
  let rafId = null

  function getContext() {
    if (!audioCtx) audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE })
    return audioCtx
  }

  function tick() {
    if (!isPlaying) return
    const elapsed = getContext().currentTime - startTime + pauseOffset
    if (onTimeUpdate) onTimeUpdate(elapsed)
    rafId = requestAnimationFrame(tick)
  }

  return {
    get playing() {
      return isPlaying
    },
    get duration() {
      return currentBuffer ? currentBuffer.duration : 0
    },
    setOnTimeUpdate(fn) {
      onTimeUpdate = fn
    },
    setOnEnded(fn) {
      onEnded = fn
    },
    loadFloat32(float32Array, sampleRate = SAMPLE_RATE) {
      const ctx = getContext()
      const audioBuffer = ctx.createBuffer(1, float32Array.length, sampleRate)
      audioBuffer.getChannelData(0).set(float32Array)
      currentBuffer = audioBuffer
      pauseOffset = 0
    },
    play() {
      if (!currentBuffer || isPlaying) return
      const ctx = getContext()
      if (ctx.state === 'suspended') ctx.resume()
      sourceNode = ctx.createBufferSource()
      sourceNode.buffer = currentBuffer
      sourceNode.connect(ctx.destination)
      sourceNode.onended = () => {
        if (isPlaying) {
          isPlaying = false
          pauseOffset = 0
          cancelAnimationFrame(rafId)
          if (onEnded) onEnded()
        }
      }
      startTime = ctx.currentTime
      sourceNode.start(0, pauseOffset)
      isPlaying = true
      tick()
    },
    pause() {
      if (!isPlaying) return
      pauseOffset += getContext().currentTime - startTime
      sourceNode.onended = null
      sourceNode.stop()
      sourceNode.disconnect()
      isPlaying = false
      cancelAnimationFrame(rafId)
    },
    stop() {
      if (sourceNode) {
        sourceNode.onended = null
        if (isPlaying) {
          sourceNode.stop()
          sourceNode.disconnect()
        }
      }
      isPlaying = false
      pauseOffset = 0
      cancelAnimationFrame(rafId)
      if (onTimeUpdate) onTimeUpdate(0)
    },
    seek(time) {
      const wasPlaying = isPlaying
      if (isPlaying) {
        sourceNode.onended = null
        sourceNode.stop()
        sourceNode.disconnect()
        isPlaying = false
        cancelAnimationFrame(rafId)
      }
      pauseOffset = time
      if (wasPlaying) this.play()
    },
    destroy() {
      this.stop()
      if (audioCtx) {
        audioCtx.close()
        audioCtx = null
      }
    },
  }
}
