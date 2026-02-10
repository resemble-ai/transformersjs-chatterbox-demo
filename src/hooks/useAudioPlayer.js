import { useState, useRef, useCallback, useEffect } from 'react'
import { createAudioPlayer } from '../lib/audio-player'

export function useAudioPlayer() {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const playerRef = useRef(null)

  useEffect(() => {
    playerRef.current = createAudioPlayer()
    playerRef.current.setOnTimeUpdate((t) => setCurrentTime(t))
    playerRef.current.setOnEnded(() => {
      setPlaying(false)
      setCurrentTime(0)
    })
    return () => playerRef.current?.destroy()
  }, [])

  const loadAudio = useCallback((float32Array, sampleRate) => {
    playerRef.current?.loadFloat32(float32Array, sampleRate)
    setDuration(playerRef.current?.duration ?? 0)
    setCurrentTime(0)
    setPlaying(false)
  }, [])

  const play = useCallback(() => {
    playerRef.current?.play()
    setPlaying(true)
  }, [])

  const pause = useCallback(() => {
    playerRef.current?.pause()
    setPlaying(false)
  }, [])

  const stop = useCallback(() => {
    playerRef.current?.stop()
    setPlaying(false)
    setCurrentTime(0)
  }, [])

  const seek = useCallback((time) => {
    playerRef.current?.seek(time)
    setCurrentTime(time)
  }, [])

  const togglePlay = useCallback(() => {
    if (playing) pause()
    else play()
  }, [playing, play, pause])

  return {
    playing,
    currentTime,
    duration,
    loadAudio,
    play,
    pause,
    stop,
    seek,
    togglePlay,
  }
}
