import { useEffect } from 'react'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'

export default function AudioPlayer({ audioData, sampleRate, autoPlay = false }) {
  const { playing, currentTime, duration, loadAudio, togglePlay, seek } = useAudioPlayer()

  useEffect(() => {
    if (audioData) {
      loadAudio(audioData, sampleRate)
      if (autoPlay) togglePlay()
    }
  }, [audioData])

  if (!audioData) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50">
      <button
        onClick={togglePlay}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-violet-600 hover:bg-violet-500 transition-colors shrink-0"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4 ml-0.5">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>

      <div
        className="flex-1 h-1.5 bg-zinc-800 rounded-full cursor-pointer relative"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const pct = (e.clientX - rect.left) / rect.width
          seek(pct * duration)
        }}
      >
        <div
          className="absolute inset-y-0 left-0 bg-violet-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="text-xs text-zinc-500 tabular-nums shrink-0">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  )
}

function formatTime(seconds) {
  if (seconds < 1 && seconds > 0) return `0:00.${Math.floor((seconds % 1) * 10)}`
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
