import { useCallback, useEffect, useRef } from 'react'
import { ttsClient } from '../lib/tts-client'
import { useAppStore } from '../store/app-store'

export function useTTS() {
  const {
    modelStatus,
    setModelStatus,
    setModelDevice,
    setModelDtype,
    setWebGPUAvailable,
    setLoadProgress,
    setModelError,
    setSpeakerEncoded,
    encodedSpeakers,
  } = useAppStore()

  const progressRef = useRef([])

  useEffect(() => {
    const unsubProgress = ttsClient.onProgress((p) => {
      if (p.status === 'progress' || p.status === 'done' || p.status === 'initiate') {
        progressRef.current = [...progressRef.current.filter(
          (x) => x.file !== p.file
        ), p]
        setLoadProgress([...progressRef.current])
      }
    })

    // If the worker gets recreated (e.g. HMR), reset model status so user re-loads
    const unsubReset = ttsClient.onReset(() => {
      setModelStatus('idle')
      setLoadProgress([])
      progressRef.current = []
    })

    return () => {
      unsubProgress()
      unsubReset()
    }
  }, [setLoadProgress, setModelStatus])

  // On mount, if store says "ready" but the worker was recreated, reset
  useEffect(() => {
    if (modelStatus === 'ready' && !ttsClient.isModelLoaded) {
      setModelStatus('idle')
      setLoadProgress([])
    }
  }, [])

  const loadModel = useCallback(async (options = {}) => {
    if (modelStatus === 'loading' || modelStatus === 'ready') return
    setModelStatus('loading')
    setModelError(null)
    progressRef.current = []
    try {
      const result = await ttsClient.load(options)
      setModelDevice(result.device)
      setModelDtype(result.dtype)
      setWebGPUAvailable(result.webgpu)
      setModelStatus('ready')
    } catch (err) {
      setModelError(err.message)
      setModelStatus('error')
    }
  }, [modelStatus, setModelStatus, setModelDevice, setModelDtype, setWebGPUAvailable, setModelError])

  const encodeSpeaker = useCallback(async (id, audioData) => {
    await ttsClient.encodeSpeaker(id, audioData)
    setSpeakerEncoded(id, audioData)
  }, [setSpeakerEncoded])

  const generate = useCallback(async (text, speakerId, exaggeration = 0.5) => {
    const start = performance.now()
    const result = await ttsClient.generate(text, speakerId, exaggeration)
    const elapsed = performance.now() - start
    return {
      waveform: new Float32Array(result.waveform),
      inferenceTime: elapsed,
    }
  }, [])

  const checkWebGPU = useCallback(async () => {
    const result = await ttsClient.checkWebGPU()
    setWebGPUAvailable(result.available)
    return result
  }, [setWebGPUAvailable])

  return {
    modelStatus,
    loadModel,
    encodeSpeaker,
    generate,
    checkWebGPU,
    isSpeakerEncoded: (id) => !!encodedSpeakers[id],
  }
}
