import { useCallback, useMemo, useState } from 'react'
import ModeHeader from '../layout/ModeHeader'
import ModelLoader from '../shared/ModelLoader'
import VoiceRecorder from '../shared/VoiceRecorder'
import AudioPlayer from '../shared/AudioPlayer'
import ExaggerationSlider from '../shared/ExaggerationSlider'
import GenerateButton from '../shared/GenerateButton'
import ChunkProgressBar from '../shared/ChunkProgressBar'
import WordLevelTranscript from '../shared/WordLevelTranscript'

import { useChunkedTTS } from '../../hooks/useChunkedTTS'
import { useModelStatus } from '../../hooks/useModelStatus'
import { useAppStore } from '../../store/app-store'
import { SAMPLE_RATE } from '../../lib/constants'
import { downloadBlob, encodeWAV } from '../../lib/audio-utils'
import { useReferenceVoices } from '../../hooks/useReferenceVoices'
import { useTTSQueue } from '../../hooks/useTTSQueue'

export default function PlaygroundPage() {
  const { isReady } = useModelStatus()
  const {
    encodeSpeaker,
    generateChunked,
    abortGeneration,
    isSpeakerEncoded,
    chunkProgress,
  } = useChunkedTTS()
  const playground = useAppStore((s) => s.playground)
  const setPlayground = useAppStore((s) => s.setPlayground)

  const [encodingVoice, setEncodingVoice] = useState(false)
  const [voiceName, setVoiceName] = useState('')
  const [selectedVoiceId, setSelectedVoiceId] = useState(null)
  const [queueInput, setQueueInput] = useState('')
  const [previewTime, setPreviewTime] = useState(0)
  const [previewDuration, setPreviewDuration] = useState(0)
  const [jobPlayback, setJobPlayback] = useState({})
  const [activeQueueTranscriptId, setActiveQueueTranscriptId] = useState(null)

  const {
    voices,
    loading: voicesLoading,
    saveVoice,
    removeVoice,
    loadVoiceAudio,
  } = useReferenceVoices()

  const ensureSpeaker = useCallback(async (speakerId) => {
    if (!speakerId || !playground.voiceAudio) return
    if (isSpeakerEncoded(speakerId)) return
    setEncodingVoice(true)
    try {
      await encodeSpeaker(speakerId, playground.voiceAudio)
    } finally {
      setEncodingVoice(false)
    }
  }, [encodeSpeaker, isSpeakerEncoded, playground.voiceAudio])

  const queue = useTTSQueue({ generateChunked, ensureSpeaker, abortGeneration })

  const activeSpeakerId = useMemo(() => {
    if (selectedVoiceId) return `saved-${selectedVoiceId}`
    if (playground.voiceId) return `temp-${playground.voiceId}`
    return null
  }, [selectedVoiceId, playground.voiceId])

  const handleVoiceReady = useCallback((audioData) => {
    setSelectedVoiceId(null)
    setPlayground({
      voiceAudio: audioData,
      voiceId: crypto.randomUUID(),
    })
  }, [setPlayground])

  const handleUseSavedVoice = useCallback(async (voiceId) => {
    const audioData = await loadVoiceAudio(voiceId)
    if (!audioData) return
    setSelectedVoiceId(voiceId)
    setPlayground({ voiceAudio: audioData })
  }, [loadVoiceAudio, setPlayground])

  const handleSaveVoice = useCallback(async () => {
    if (!playground.voiceAudio || !voiceName.trim()) return
    const savedId = await saveVoice(voiceName, playground.voiceAudio)
    setVoiceName('')
    setSelectedVoiceId(savedId)
  }, [playground.voiceAudio, saveVoice, voiceName])

  const handleGenerate = useCallback(async () => {
    if (!playground.voiceAudio || !playground.text.trim() || !activeSpeakerId) return

    setPlayground({
      generating: true,
      generatedAudio: null,
      generatedWordTimestamps: null,
      inferenceTime: null,
    })

    try {
      await ensureSpeaker(activeSpeakerId)
      const result = await generateChunked(playground.text, activeSpeakerId, playground.exaggeration)

      if (result) {
        setPlayground({
          generatedAudio: result.waveform,
          generatedWordTimestamps: result.wordTimestamps ?? null,
          inferenceTime: result.inferenceTime,
          generating: false,
        })
      } else {
        setPlayground({ generating: false })
      }
    } catch (err) {
      console.error('Generation failed:', err)
      setPlayground({ generating: false })
    }
  }, [activeSpeakerId, ensureSpeaker, generateChunked, playground.exaggeration, playground.text, playground.voiceAudio, setPlayground])

  const handleQueueFiles = useCallback(async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    await queue.addTextFiles(files)
    e.target.value = ''
  }, [queue])

  const handleStartQueue = useCallback(async () => {
    if (!activeSpeakerId || !playground.voiceAudio) return
    await queue.start(activeSpeakerId, playground.exaggeration)
  }, [activeSpeakerId, playground.exaggeration, playground.voiceAudio, queue])

  const audioDuration =
    playground.generatedAudio ? playground.generatedAudio.length / SAMPLE_RATE : null
  const realTimeFactor =
    playground.inferenceTime && audioDuration
      ? (playground.inferenceTime / 1000) / audioDuration
      : null

  const canGenerate = !!(playground.voiceAudio && playground.text.trim() && activeSpeakerId)
  const activeQueueJob = queue.jobs.find((job) => job.id === activeQueueTranscriptId) ?? null
  const generateLabel = encodingVoice
    ? 'Encoding Voice...'
    : playground.generating
      ? chunkProgress.total > 1
        ? `Generating chunk ${chunkProgress.current} of ${chunkProgress.total}...`
        : 'Generating...'
      : 'Generate Speech'

  return (
    <div className="flex flex-col h-full">
      <ModeHeader
        title="Playground"
        description="Explore the full power of Chatterbox TTS"
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {!isReady && (
            <div className="max-w-lg mx-auto mb-8">
              <ModelLoader />
            </div>
          )}

          {isReady && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    Text to Speak
                  </label>
                  <textarea
                    value={playground.text}
                    onChange={(e) => setPlayground({ text: e.target.value })}
                    placeholder="Type or paste the text you want to convert to speech..."
                    rows={6}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none resize-y"
                  />
                </div>

                <ExaggerationSlider
                  value={playground.exaggeration}
                  onChange={(val) => setPlayground({ exaggeration: val })}
                />

                <GenerateButton
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  generating={playground.generating || encodingVoice}
                  label={generateLabel}
                />
                {playground.generating && (
                  <ChunkProgressBar
                    current={chunkProgress.current}
                    total={chunkProgress.total}
                  />
                )}

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-200">Batch Queue</h3>
                    <span className="text-xs text-zinc-500">
                      {queue.counts.done}/{queue.counts.total} done
                    </span>
                  </div>

                  <textarea
                    value={queueInput}
                    onChange={(e) => setQueueInput(e.target.value)}
                    rows={4}
                    placeholder="Paste multiple jobs separated by blank lines"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        queue.addBatchText(queueInput)
                        setQueueInput('')
                      }}
                      className="px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    >
                      Add batch text
                    </button>
                    <button
                      type="button"
                      onClick={() => queue.addTexts([playground.text])}
                      className="px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    >
                      Queue current text
                    </button>
                    <label className="px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 cursor-pointer">
                      Upload .txt files
                      <input type="file" accept=".txt,text/plain" multiple className="hidden" onChange={handleQueueFiles} />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleStartQueue}
                      disabled={queue.running || !canGenerate || queue.counts.queued === 0}
                      className="px-3 py-1.5 text-xs rounded-md bg-violet-600 text-white disabled:opacity-50"
                    >
                      {queue.running ? 'Processing...' : 'Start queue'}
                    </button>
                    <button
                      type="button"
                      onClick={queue.stop}
                      disabled={!queue.running}
                      className="px-3 py-1.5 text-xs rounded-md bg-zinc-700 text-zinc-100 disabled:opacity-50"
                    >
                      Stop
                    </button>
                    <button
                      type="button"
                      onClick={queue.clearFinished}
                      className="px-3 py-1.5 text-xs rounded-md bg-zinc-700 text-zinc-100"
                    >
                      Clear finished
                    </button>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {queue.jobs.length === 0 && (
                        <p className="text-xs text-zinc-500">No jobs queued yet.</p>
                      )}
                      {queue.jobs.map((job) => (
                        <div key={job.id} className="rounded border border-zinc-800 bg-zinc-950/70 p-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-zinc-200 truncate">{job.title}</p>
                            <span className="text-zinc-500 uppercase">{job.status}</span>
                          </div>
                          {job.error && <p className="text-red-400 mt-1">{job.error}</p>}
                          {job.output?.url && (
                            <div className="mt-2 space-y-2">
                              <audio
                                controls
                                preload="none"
                                src={job.output.url}
                                className="w-full h-8"
                                onPlay={() => setActiveQueueTranscriptId(job.id)}
                                onTimeUpdate={(e) => {
                                  const el = e.currentTarget
                                  setActiveQueueTranscriptId(job.id)
                                  setJobPlayback((prev) => ({
                                    ...prev,
                                    [job.id]: {
                                      ...prev[job.id],
                                      currentTime: el.currentTime,
                                      duration: Number.isFinite(el.duration) ? el.duration : prev[job.id]?.duration || 0,
                                    },
                                  }))
                                }}
                                onLoadedMetadata={(e) => {
                                  const el = e.currentTarget
                                  setJobPlayback((prev) => ({
                                    ...prev,
                                    [job.id]: {
                                      ...prev[job.id],
                                      duration: Number.isFinite(el.duration) ? el.duration : 0,
                                    },
                                  }))
                                }}
                              />
                              <div className="flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => setActiveQueueTranscriptId(job.id)}
                                  className={`text-[11px] px-2 py-1 rounded ${activeQueueTranscriptId === job.id ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                                >
                                  {activeQueueTranscriptId === job.id ? 'Viewing transcript' : 'View transcript'}
                                </button>
                                <a href={job.output.url} download={`${job.title.replace(/\.[^/.]+$/, '')}.wav`} className="text-violet-400 hover:text-violet-300 inline-block">
                                  Download WAV
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 min-h-48">
                      {activeQueueJob?.output?.url ? (
                        <WordLevelTranscript
                          title={`Current transcript: ${activeQueueJob.title}`}
                          text={activeQueueJob.text}
                          wordTimestamps={activeQueueJob.output.wordTimestamps}
                          currentTime={jobPlayback[activeQueueJob.id]?.currentTime ?? 0}
                          duration={jobPlayback[activeQueueJob.id]?.duration ?? 0}
                          maxHeightClass="max-h-60"
                        />
                      ) : (
                        <p className="text-xs text-zinc-500">
                          Select a finished job (or press play) to view a synchronized transcript panel.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <VoiceRecorder
                  onVoiceReady={handleVoiceReady}
                  label="Reference Voice"
                />

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-200">Saved Voice Library</h3>
                  <div className="flex gap-2">
                    <input
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value)}
                      placeholder="Voice name"
                      className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
                    />
                    <button
                      type="button"
                      onClick={handleSaveVoice}
                      disabled={!playground.voiceAudio || !voiceName.trim()}
                      className="px-3 py-2 text-xs rounded-md bg-violet-600 text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>

                  {voicesLoading && <p className="text-xs text-zinc-500">Loading voices...</p>}
                  {!voicesLoading && voices.length === 0 && (
                    <p className="text-xs text-zinc-500">No saved voices yet.</p>
                  )}

                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {voices.map((voice) => {
                      const isActive = selectedVoiceId === voice.id
                      return (
                        <div key={voice.id} className="rounded border border-zinc-800 bg-zinc-950/70 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-zinc-200 truncate">{voice.name}</p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleUseSavedVoice(voice.id)}
                                className={`px-2 py-1 text-[11px] rounded ${isActive ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-200'}`}
                              >
                                {isActive ? 'Using' : 'Use'}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeVoice(voice.id)}
                                className="px-2 py-1 text-[11px] rounded bg-zinc-800 text-zinc-300"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {playground.generatedAudio && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-zinc-300">
                      Generated Output
                    </label>
                    <AudioPlayer
                      audioData={playground.generatedAudio}
                      sampleRate={SAMPLE_RATE}
                      autoPlay
                      onTimeChange={setPreviewTime}
                      onDurationChange={setPreviewDuration}
                    />
                    <WordLevelTranscript
                      text={playground.text}
                      wordTimestamps={playground.generatedWordTimestamps}
                      currentTime={previewTime}
                      duration={previewDuration}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        downloadBlob(encodeWAV(playground.generatedAudio), 'playground-output.wav')
                      }}
                      className="px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    >
                      Download WAV
                    </button>
                  </div>
                )}

                {playground.inferenceTime != null && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      Performance Metrics
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Inference Time</p>
                        <p className="text-lg font-semibold tabular-nums text-zinc-100">
                          {(playground.inferenceTime / 1000).toFixed(2)}
                          <span className="text-xs font-normal text-zinc-500 ml-1">s</span>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Audio Duration</p>
                        <p className="text-lg font-semibold tabular-nums text-zinc-100">
                          {audioDuration != null ? audioDuration.toFixed(2) : '--'}
                          <span className="text-xs font-normal text-zinc-500 ml-1">s</span>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Real-Time Factor</p>
                        <p className="text-lg font-semibold tabular-nums text-zinc-100">
                          {realTimeFactor != null ? realTimeFactor.toFixed(2) : '--'}
                          <span className="text-xs font-normal text-zinc-500 ml-1">x</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
