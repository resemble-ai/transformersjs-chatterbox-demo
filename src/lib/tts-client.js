let worker = null
let listeners = new Map()
let progressListeners = new Set()
let resetListeners = new Set()
let modelLoaded = false

function getWorker() {
  if (!worker) {
    // If we're creating a new worker but the store thought the model was ready,
    // that means HMR or a crash recreated the worker. Notify listeners to reset.
    if (modelLoaded) {
      modelLoaded = false
      resetListeners.forEach((fn) => fn())
    }

    worker = new Worker(new URL('../workers/tts.worker.js', import.meta.url), { type: 'module' })
    worker.addEventListener('message', (e) => {
      const { type, data } = e.data

      if (type === 'load:progress') {
        progressListeners.forEach((fn) => fn(data))
        return
      }

      if (type === 'error') {
        listeners.forEach((cbs) => {
          cbs.reject(new Error(data.message))
        })
        listeners.clear()
        return
      }

      const cbs = listeners.get(type)
      if (cbs) {
        cbs.resolve(data)
        listeners.delete(type)
      }
    })

    worker.addEventListener('error', (e) => {
      const msg = e.message || 'Worker crashed'
      listeners.forEach((cbs) => {
        cbs.reject(new Error(msg))
      })
      listeners.clear()
    })
  }
  return worker
}

function send(type, data, transferable = []) {
  const responseType = `${type}:complete`
  return new Promise((resolve, reject) => {
    listeners.set(responseType, { resolve, reject })
    getWorker().postMessage({ type, data }, transferable)
  })
}

export const ttsClient = {
  get isModelLoaded() {
    return modelLoaded
  },

  checkWebGPU() {
    return send('check_webgpu')
  },

  async load(options = {}) {
    const result = await send('load', options)
    modelLoaded = true
    return result
  },

  encodeSpeaker(id, audioData) {
    const buffer = audioData instanceof Float32Array ? audioData.buffer : audioData
    return send('encode_speaker', {
      id,
      audioData: buffer,
    })
  },

  generate(text, speakerId, exaggeration = 0.5) {
    return send('generate', { text, speakerId, exaggeration })
  },

  onProgress(fn) {
    progressListeners.add(fn)
    return () => progressListeners.delete(fn)
  },

  onReset(fn) {
    resetListeners.add(fn)
    return () => resetListeners.delete(fn)
  },

  terminate() {
    if (worker) {
      worker.terminate()
      worker = null
      modelLoaded = false
      listeners.clear()
      progressListeners.clear()
    }
  },
}
