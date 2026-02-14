import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import { SAMPLE_RATE } from '../../lib/constants'
import { downloadBlob, encodeWAV } from '../../lib/audio-utils'

function tokenizeWithFallback(text, duration) {
  const words = text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
  if (words.length === 0) return []
  const step = duration > 0 ? duration / words.length : 0
  return words.map((word, i) => ({
    word,
    start: step * i,
    end: step * (i + 1),
  }))
}

function formatTime(seconds) {
  if (!seconds || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Groups tokens into lines of roughly `perLine` words for display.
 */
function groupIntoLines(tokens, perLine = 8) {
  const lines = []
  for (let i = 0; i < tokens.length; i += perLine) {
    lines.push(tokens.slice(i, i + perLine))
  }
  return lines
}

export default function AudioTranscriptModal({
  open,
  onClose,
  title = 'Audio Playback',
  text,
  audioData,
  wordTimestamps,
  downloadFilename = 'output.wav',
  autoPlay = true,
}) {
  const {
    playing,
    currentTime,
    duration,
    loadAudio,
    togglePlay,
    seek,
    stop,
  } = useAudioPlayer()

  const [closing, setClosing] = useState(false)
  const activeLineRef = useRef(null)
  const backdropRef = useRef(null)

  // Load audio when modal opens
  useEffect(() => {
    if (open && audioData) {
      loadAudio(audioData, SAMPLE_RATE)
      if (autoPlay) {
        // small delay so the modal animation is visible before audio starts
        const id = setTimeout(() => togglePlay(), 250)
        return () => clearTimeout(id)
      }
    }
  }, [open, audioData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop audio on close
  const handleClose = useCallback(() => {
    setClosing(true)
    stop()
    setTimeout(() => {
      setClosing(false)
      onClose()
    }, 200)
  }, [onClose, stop])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose()
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handleClose, togglePlay])

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === backdropRef.current) handleClose()
    },
    [handleClose],
  )

  // Build tokens
  const tokens = useMemo(() => {
    if (Array.isArray(wordTimestamps) && wordTimestamps.length > 0) {
      return wordTimestamps
        .map((t) => {
          const word = t.word ?? t.text ?? t.token
          if (!word) return null
          return {
            word: String(word),
            start: Number(t.start ?? 0),
            end: Number(t.end ?? t.start ?? 0),
          }
        })
        .filter(Boolean)
    }
    return tokenizeWithFallback(text ?? '', duration)
  }, [wordTimestamps, text, duration])

  const lines = useMemo(() => groupIntoLines(tokens, 8), [tokens])

  // Find active token index for highlighting
  const activeTokenIndex = useMemo(() => {
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (currentTime >= tokens[i].start && currentTime < tokens[i].end) return i
    }
    // If past last token end, nothing is active
    return -1
  }, [currentTime, tokens])

  // Auto-scroll active line into view
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [activeTokenIndex])

  // Seek bar interaction
  const handleSeekClick = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      seek(pct * duration)
    },
    [duration, seek],
  )

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (!open && !closing) return null

  // Map running token index to determine which line is active
  let runningIndex = 0
  const activeLineIndex = (() => {
    for (let li = 0; li < lines.length; li++) {
      for (let wi = 0; wi < lines[li].length; wi++) {
        if (runningIndex === activeTokenIndex) return li
        runningIndex++
      }
    }
    return -1
  })()

  const modalContent = (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 modal-backdrop ${closing ? 'modal-backdrop-exit' : 'modal-backdrop-enter'}`}
    >
      <div
        className={`relative w-full max-w-2xl rounded-2xl border border-zinc-700/50 bg-zinc-900 shadow-2xl shadow-black/50 flex flex-col max-h-[90vh] ${closing ? 'modal-content-exit' : 'modal-content-enter'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-800">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-100 truncate">
              {title}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {tokens.length} words
              {duration > 0 && ` \u00b7 ${formatTime(duration)}`}
              {Array.isArray(wordTimestamps) && wordTimestamps.length > 0
                ? ' \u00b7 word-level sync'
                : ' \u00b7 estimated timing'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="ml-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Audio Controls */}
        <div className="px-6 py-5 border-b border-zinc-800 space-y-4">
          {/* Play button + seek bar */}
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all shrink-0 shadow-lg shadow-violet-600/20"
            >
              {playing ? (
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-0.5">
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
              )}
            </button>

            <div className="flex-1 space-y-1.5">
              <div
                className="h-2 bg-zinc-800 rounded-full cursor-pointer relative group"
                onClick={handleSeekClick}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-violet-500 rounded-full transition-[width] duration-100"
                  style={{ width: `${progress}%` }}
                />
                {/* Scrubber thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `calc(${progress}% - 7px)` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-zinc-500 tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Keyboard hint */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-600">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">Space</kbd> play/pause
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">Esc</kbd> close
            </span>
          </div>
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          <div className="space-y-2">
            {(() => {
              let globalIdx = 0
              return lines.map((line, lineIdx) => {
                const isActiveLine = lineIdx === activeLineIndex
                return (
                  <div
                    key={lineIdx}
                    ref={isActiveLine ? activeLineRef : null}
                    className={`flex flex-wrap gap-x-1 gap-y-1 py-1.5 px-2 rounded-lg transition-colors duration-300 ${isActiveLine ? 'bg-zinc-800/50' : ''}`}
                  >
                    {line.map((token) => {
                      const idx = globalIdx++
                      const isActive = idx === activeTokenIndex
                      const isPast = activeTokenIndex >= 0 && idx < activeTokenIndex
                      const isFuture = activeTokenIndex >= 0 && idx > activeTokenIndex

                      let classes = 'text-base sm:text-lg rounded px-1 py-0.5 transition-all duration-150 '
                      if (isActive) {
                        classes += 'bg-violet-500/30 text-white font-medium transcript-word-active'
                      } else if (isPast) {
                        classes += 'text-zinc-300'
                      } else if (isFuture) {
                        classes += 'text-zinc-500'
                      } else {
                        // No active token (paused at start, etc)
                        classes += 'text-zinc-400'
                      }

                      return (
                        <span
                          key={`${token.word}-${idx}-${token.start}`}
                          className={classes}
                        >
                          {token.word}
                        </span>
                      )
                    })}
                  </div>
                )
              })
            })()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => {
              if (audioData) {
                downloadBlob(encodeWAV(audioData), downloadFilename)
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download WAV
          </button>

          <button
            onClick={handleClose}
            className="px-4 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
