import { useRef } from 'react'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import AudioWaveform from './AudioWaveform'

export default function VoiceRecorder({ onVoiceReady, label = 'Voice Sample' }) {
  const { recording, audioData, startRecording, stopRecording, loadFile, clear } = useAudioRecorder()
  const fileRef = useRef(null)

  const handleToggleRecord = async () => {
    if (recording) {
      const data = await stopRecording()
      if (data && onVoiceReady) onVoiceReady(data)
    } else {
      await startRecording()
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const data = await loadFile(file)
    if (onVoiceReady) onVoiceReady(data)
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-zinc-300">{label}</label>

      {audioData ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
          <AudioWaveform data={audioData} height={48} />
          <div className="flex gap-2">
            <span className="text-xs text-zinc-500 flex-1">
              {(audioData.length / 24000).toFixed(1)}s recorded
            </span>
            <button
              onClick={() => { clear(); if (onVoiceReady) onVoiceReady(null) }}
              className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleToggleRecord}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
              recording
                ? 'border-red-500 bg-red-500/10 text-red-400 animate-pulse'
                : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            {recording ? 'Stop Recording' : 'Record Voice'}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-3 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 text-sm hover:border-zinc-600 transition-colors"
          >
            Upload
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  )
}
