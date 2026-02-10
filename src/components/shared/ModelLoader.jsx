import { useModelStatus } from '../../hooks/useModelStatus'
import { useTTS } from '../../hooks/useTTS'

// Friendly names for the 4 ONNX sessions
const SESSION_LABELS = {
  'embed_tokens': 'Embed Tokens',
  'speech_encoder': 'Speech Encoder',
  'language_model': 'Language Model',
  'language_model_q4': 'Language Model',
  'language_model_q4f16': 'Language Model',
  'language_model_fp16': 'Language Model',
  'conditional_decoder': 'Conditional Decoder',
}

function getFileLabel(filePath) {
  if (!filePath) return null
  // Extract the filename without extension from paths like "onnx/language_model_q4.onnx"
  const basename = filePath.split('/').pop().replace(/\.onnx(_data)?$/, '')
  return SESSION_LABELS[basename] || basename
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ModelLoader({ compact = false }) {
  const { isIdle, isLoading, isReady, isError, loadProgress, modelDevice, modelError } = useModelStatus()
  const { loadModel } = useTTS()

  if (isReady && compact) return null

  if (isReady) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-green-400">Model Ready</span>
          <span className="text-xs text-zinc-500 ml-auto">{modelDevice?.toUpperCase()}</span>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-sm text-red-400 mb-2">Failed to load model</p>
        <p className="text-xs text-zinc-500 mb-3 break-all">{modelError}</p>
        <button
          onClick={() => loadModel()}
          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (isLoading) {
    // Only show ONNX model files (not config.json, tokenizer.json, etc.)
    // Group by session name (e.g., merge "language_model_q4.onnx" and "language_model_q4.onnx_data")
    const onnxFiles = loadProgress.filter((p) => p.file && p.file.endsWith('.onnx'))
    const dataFiles = loadProgress.filter((p) => p.file && p.file.endsWith('.onnx_data'))

    // Build a map of session -> aggregate progress
    const sessions = new Map()
    for (const f of [...onnxFiles, ...dataFiles]) {
      const label = getFileLabel(f.file)
      if (!label) continue
      const existing = sessions.get(label)
      if (!existing) {
        sessions.set(label, { ...f, label, size: f.total || 0 })
      } else {
        // Merge: if either part is still loading, the session is loading
        if (f.status !== 'done') {
          existing.status = f.status
          existing.progress = f.progress
        }
        existing.size = (existing.size || 0) + (f.total || 0)
      }
    }

    const sessionList = [...sessions.values()]
    const allDownloaded = sessionList.length > 0 && sessionList.every((s) => s.status === 'done')

    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm font-medium text-zinc-300">
            {allDownloaded ? 'Creating inference sessions...' : 'Downloading model files...'}
          </span>
        </div>

        {sessionList.map((s) => (
          <div key={s.label} className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{s.label}</span>
              <span>
                {s.status === 'done'
                  ? formatBytes(s.size) || 'Done'
                  : s.progress != null
                    ? `${Math.round(s.progress)}%`
                    : '...'}
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  s.status === 'done' ? 'bg-green-500' : 'bg-violet-500 animate-progress-pulse'
                }`}
                style={{ width: `${s.status === 'done' ? 100 : s.progress || 0}%` }}
              />
            </div>
          </div>
        ))}

        {allDownloaded && (
          <p className="text-xs text-zinc-600 animate-pulse">
            Compiling ONNX sessions (this may take a minute)...
          </p>
        )}
      </div>
    )
  }

  // Idle
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
      <p className="text-sm text-zinc-400 mb-4">
        Load the Chatterbox TTS model to get started (~1.5 GB download, cached after first load)
      </p>
      <button
        onClick={() => loadModel()}
        className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
      >
        Load Model
      </button>
    </div>
  )
}
