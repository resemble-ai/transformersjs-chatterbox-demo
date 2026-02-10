import { useState, useRef, useCallback } from 'react'
import { recordAudio, fileToFloat32 } from '../lib/audio-recorder'

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false)
  const [audioData, setAudioData] = useState(null)
  const recorderRef = useRef(null)
  const analyserRef = useRef(null)

  const startRecording = useCallback(async () => {
    const rec = await recordAudio()
    recorderRef.current = rec
    const { analyser, ctx } = rec.getAnalyserNode()
    analyserRef.current = { analyser, ctx }
    rec.start()
    setRecording(true)
  }, [])

  const stopRecording = useCallback(async () => {
    if (!recorderRef.current) return null
    setRecording(false)
    const float32 = await recorderRef.current.stop()
    if (analyserRef.current?.ctx) {
      analyserRef.current.ctx.close()
      analyserRef.current = null
    }
    recorderRef.current = null
    setAudioData(float32)
    return float32
  }, [])

  const loadFile = useCallback(async (file) => {
    const float32 = await fileToFloat32(file)
    setAudioData(float32)
    return float32
  }, [])

  const clear = useCallback(() => {
    setAudioData(null)
  }, [])

  return {
    recording,
    audioData,
    startRecording,
    stopRecording,
    loadFile,
    clear,
    analyser: analyserRef.current?.analyser ?? null,
  }
}
