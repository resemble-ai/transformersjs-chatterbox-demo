import { useCallback, useRef, useState } from 'react'
import ModeHeader from '../layout/ModeHeader'
import ModelLoader from '../shared/ModelLoader'
import VoiceRecorder from '../shared/VoiceRecorder'
import AudioPlayer from '../shared/AudioPlayer'
import ExaggerationSlider from '../shared/ExaggerationSlider'
import GenerateButton from '../shared/GenerateButton'
import TagHelper from '../shared/TagHelper'
import { useTTS } from '../../hooks/useTTS'
import { useModelStatus } from '../../hooks/useModelStatus'
import { useAppStore } from '../../store/app-store'
import { SAMPLE_RATE } from '../../lib/constants'

const SPEAKER_ID = 'playground-voice'

export default function PlaygroundPage() {
  const { isReady } = useModelStatus()
  const { loadModel, encodeSpeaker, generate, isSpeakerEncoded } = useTTS()
  const playground = useAppStore((s) => s.playground)
  const setPlayground = useAppStore((s) => s.setPlayground)

  const textareaRef = useRef(null)
  const [encodingVoice, setEncodingVoice] = useState(false)

  // --- Voice handling ---
  const handleVoiceReady = useCallback(
    (audioData) => {
      setPlayground({ voiceAudio: audioData })
    },
    [setPlayground],
  )

  // --- Tag insertion ---
  const handleInsertTag = useCallback(
    (tag) => {
      const ta = textareaRef.current
      if (!ta) {
        setPlayground({ text: playground.text + tag })
        return
      }
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const before = playground.text.slice(0, start)
      const after = playground.text.slice(end)
      const newText = before + tag + after
      setPlayground({ text: newText })
      // Restore cursor after the inserted tag
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + tag.length
        ta.focus()
      })
    },
    [playground.text, setPlayground],
  )

  // --- Generation flow ---
  const handleGenerate = useCallback(async () => {
    if (!playground.voiceAudio || !playground.text.trim()) return

    setPlayground({ generating: true, generatedAudio: null, inferenceTime: null })

    try {
      // Encode speaker if not already cached
      if (!isSpeakerEncoded(SPEAKER_ID)) {
        setEncodingVoice(true)
        await encodeSpeaker(SPEAKER_ID, playground.voiceAudio)
        setEncodingVoice(false)
      }

      const result = await generate(playground.text, SPEAKER_ID, playground.exaggeration)

      setPlayground({
        generatedAudio: result.waveform,
        inferenceTime: result.inferenceTime,
        generating: false,
      })
    } catch (err) {
      console.error('Generation failed:', err)
      setPlayground({ generating: false })
      setEncodingVoice(false)
    }
  }, [playground.voiceAudio, playground.text, playground.exaggeration, isSpeakerEncoded, encodeSpeaker, generate, setPlayground])

  // --- Computed metrics ---
  const audioDuration =
    playground.generatedAudio ? playground.generatedAudio.length / SAMPLE_RATE : null
  const realTimeFactor =
    playground.inferenceTime && audioDuration
      ? (playground.inferenceTime / 1000) / audioDuration
      : null

  // --- Determine generate button disabled state ---
  const canGenerate = !!(playground.voiceAudio && playground.text.trim())
  const generateLabel = encodingVoice
    ? 'Encoding Voice...'
    : playground.generating
      ? 'Generating...'
      : 'Generate Speech'

  return (
    <div className="flex flex-col h-full">
      <ModeHeader
        title="Playground"
        description="Explore the full power of Chatterbox TTS"
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Model loader when model is not ready */}
          {!isReady && (
            <div className="max-w-lg mx-auto mb-8">
              <ModelLoader />
            </div>
          )}

          {/* Main playground UI */}
          {isReady && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* ---- Left Column: Text & Controls ---- */}
              <div className="space-y-6">
                {/* Text Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    Text to Speak
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={playground.text}
                    onChange={(e) => setPlayground({ text: e.target.value })}
                    placeholder="Type or paste the text you want to convert to speech..."
                    rows={6}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none resize-y"
                  />
                  <TagHelper onInsert={handleInsertTag} />
                </div>

                {/* Exaggeration Slider */}
                <ExaggerationSlider
                  value={playground.exaggeration}
                  onChange={(val) => setPlayground({ exaggeration: val })}
                />

                {/* Generate Button */}
                <GenerateButton
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  generating={playground.generating || encodingVoice}
                  label={generateLabel}
                />
              </div>

              {/* ---- Right Column: Voice & Output ---- */}
              <div className="space-y-6">
                {/* Voice Recorder */}
                <VoiceRecorder
                  onVoiceReady={handleVoiceReady}
                  label="Reference Voice"
                />

                {/* Generated Audio Player */}
                {playground.generatedAudio && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-zinc-300">
                      Generated Output
                    </label>
                    <AudioPlayer
                      audioData={playground.generatedAudio}
                      sampleRate={SAMPLE_RATE}
                      autoPlay
                    />
                  </div>
                )}

                {/* Metrics Panel */}
                {playground.inferenceTime != null && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      Performance Metrics
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Inference Time */}
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Inference Time</p>
                        <p className="text-lg font-semibold tabular-nums text-zinc-100">
                          {(playground.inferenceTime / 1000).toFixed(2)}
                          <span className="text-xs font-normal text-zinc-500 ml-1">
                            s
                          </span>
                        </p>
                      </div>
                      {/* Audio Duration */}
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Audio Duration</p>
                        <p className="text-lg font-semibold tabular-nums text-zinc-100">
                          {audioDuration != null ? audioDuration.toFixed(2) : '--'}
                          <span className="text-xs font-normal text-zinc-500 ml-1">
                            s
                          </span>
                        </p>
                      </div>
                      {/* Real-Time Factor */}
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Real-Time Factor</p>
                        <p className="text-lg font-semibold tabular-nums text-zinc-100">
                          {realTimeFactor != null ? realTimeFactor.toFixed(2) : '--'}
                          <span className="text-xs font-normal text-zinc-500 ml-1">
                            x
                          </span>
                        </p>
                      </div>
                    </div>
                    {realTimeFactor != null && (
                      <p className="text-xs text-zinc-600">
                        {realTimeFactor < 1
                          ? 'Faster than real-time generation'
                          : realTimeFactor < 2
                            ? 'Near real-time generation'
                            : 'Slower than real-time generation'}
                      </p>
                    )}
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
