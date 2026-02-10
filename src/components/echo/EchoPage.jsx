import { useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ModeHeader from '../layout/ModeHeader'
import ModelLoader from '../shared/ModelLoader'
import VoiceRecorder from '../shared/VoiceRecorder'
import AudioPlayer from '../shared/AudioPlayer'
import ExaggerationSlider from '../shared/ExaggerationSlider'
import GenerateButton from '../shared/GenerateButton'

import { useTTS } from '../../hooks/useTTS'
import { useModelStatus } from '../../hooks/useModelStatus'
import { useAppStore } from '../../store/app-store'
import { SAMPLE_RATE, ECHO_TEMPLATES } from '../../lib/constants'
import { encodeWAV, downloadBlob } from '../../lib/audio-utils'

const SPEAKER_ID = 'echo-voice'

const stepVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
  exit: (direction) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    transition: { duration: 0.25, ease: 'easeIn' },
  }),
}

const STEP_LABELS = ['Record Voice', 'Compose Message', 'Preview & Share']

export default function EchoPage() {
  const { isReady } = useModelStatus()
  const { encodeSpeaker, generate, isSpeakerEncoded } = useTTS()
  const echo = useAppStore((s) => s.echo)
  const setEcho = useAppStore((s) => s.setEcho)
  const directionRef = useRef(1)

  const { step, voiceAudio, text, templateId, generatedAudio, generating } = echo
  const selectedTemplate = ECHO_TEMPLATES.find((t) => t.id === templateId) || ECHO_TEMPLATES[0]
  const exaggeration = echo.exaggeration ?? 0.5

  // ---- Handlers ----

  const handleVoiceReady = useCallback(
    (audioData) => {
      setEcho({ voiceAudio: audioData })
    },
    [setEcho],
  )

  const goToStep = useCallback(
    (nextStep) => {
      directionRef.current = nextStep > step ? 1 : -1
      setEcho({ step: nextStep })
    },
    [step, setEcho],
  )

  const handleNext = useCallback(async () => {
    if (step === 0 && voiceAudio) {
      if (!isSpeakerEncoded(SPEAKER_ID)) {
        await encodeSpeaker(SPEAKER_ID, voiceAudio)
      }
      goToStep(1)
    }
  }, [step, voiceAudio, isSpeakerEncoded, encodeSpeaker, goToStep])

  const handleGenerate = useCallback(async () => {
    if (!text.trim() || generating) return
    setEcho({ generating: true, generatedAudio: null })
    try {
      const { waveform } = await generate(text, SPEAKER_ID, exaggeration)
      setEcho({ generatedAudio: waveform, generating: false })
      goToStep(2)
    } catch (err) {
      console.error('Echo generation failed:', err)
      setEcho({ generating: false })
    }
  }, [text, generating, exaggeration, generate, setEcho, goToStep])

  const handleDownload = useCallback(() => {
    if (!generatedAudio) return
    const wavBlob = encodeWAV(generatedAudio, SAMPLE_RATE)
    downloadBlob(wavBlob, `echo-${templateId}-message.wav`)
  }, [generatedAudio, templateId])

  const handleStartOver = useCallback(() => {
    setEcho({
      step: 0,
      voiceAudio: null,
      text: '',
      templateId: 'birthday',
      generatedAudio: null,
      generating: false,
    })
    directionRef.current = -1
  }, [setEcho])

  // ---- Render ----

  return (
    <div className="flex flex-col h-full">
      <ModeHeader
        title="Echo"
        description="Create personalized voice message cards"
      >
        <ModelLoader compact />
      </ModeHeader>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {STEP_LABELS.map((label, i) => {
              const isActive = i === step
              const isCompleted = i < step
              return (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && (
                    <div
                      className={`w-8 h-px transition-colors ${
                        isCompleted ? 'bg-violet-500' : 'bg-zinc-800'
                      }`}
                    />
                  )}
                  <button
                    onClick={() => {
                      if (isCompleted) goToStep(i)
                    }}
                    disabled={!isCompleted}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-violet-600/20 text-violet-400 border border-violet-500/40'
                        : isCompleted
                          ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer border border-zinc-700'
                          : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-default'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive
                          ? 'bg-violet-600 text-white'
                          : isCompleted
                            ? 'bg-green-600 text-white'
                            : 'bg-zinc-800 text-zinc-600'
                      }`}
                    >
                      {isCompleted ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Step content with AnimatePresence */}
          <AnimatePresence mode="wait" custom={directionRef.current}>
            {step === 0 && (
              <motion.div
                key="step-0"
                custom={directionRef.current}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-5">
                  <div className="text-center mb-2">
                    <h3 className="text-lg font-semibold text-zinc-200">Record Your Voice</h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      Record a short voice sample or upload an audio file. This will be used to clone
                      your voice for the message.
                    </p>
                  </div>

                  <VoiceRecorder
                    onVoiceReady={handleVoiceReady}
                    label="Voice Sample"
                  />

                  <button
                    onClick={handleNext}
                    disabled={!voiceAudio || !isReady}
                    className={`w-full px-5 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      voiceAudio && isReady
                        ? 'bg-violet-600 hover:bg-violet-500 text-white'
                        : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    Next: Compose Message
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                custom={directionRef.current}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                {/* Template picker */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">Choose a Template</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {ECHO_TEMPLATES.map((tpl) => {
                      const isSelected = tpl.id === templateId
                      return (
                        <button
                          key={tpl.id}
                          onClick={() => setEcho({ templateId: tpl.id })}
                          className={`group relative rounded-xl p-3 text-center transition-all ${
                            isSelected
                              ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-950 scale-105'
                              : 'hover:scale-105'
                          }`}
                        >
                          <div
                            className={`absolute inset-0 rounded-xl bg-gradient-to-br ${tpl.gradient} opacity-${
                              isSelected ? '100' : '60'
                            } group-hover:opacity-100 transition-opacity`}
                          />
                          <div className="relative">
                            <span className="text-2xl block mb-1">{tpl.emoji}</span>
                            <span className="text-[11px] font-medium text-white/90">{tpl.label}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Message text */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Your Message</label>
                  <textarea
                    value={text}
                    onChange={(e) => setEcho({ text: e.target.value })}
                    placeholder="Type your voice message here..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 resize-none transition-colors"
                  />
                </div>

                {/* Exaggeration slider */}
                <ExaggerationSlider
                  value={exaggeration}
                  onChange={(v) => setEcho({ exaggeration: v })}
                />

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => goToStep(0)}
                    className="px-4 py-3 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 text-sm hover:border-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
                    </svg>
                  </button>
                  <div className="flex-1">
                    <GenerateButton
                      onClick={handleGenerate}
                      disabled={!text.trim() || !isReady}
                      generating={generating}
                      label="Generate Voice Card"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                custom={directionRef.current}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                {/* Card preview */}
                <div className="flex justify-center">
                  <div className="w-full max-w-sm">
                    <div
                      className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${selectedTemplate.gradient} shadow-2xl`}
                    >
                      {/* Decorative pattern overlay */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-4 right-4 text-7xl">{selectedTemplate.emoji}</div>
                        <div className="absolute bottom-8 left-6 text-5xl opacity-50">{selectedTemplate.emoji}</div>
                        <div className="absolute top-1/2 right-1/3 text-3xl opacity-30">{selectedTemplate.emoji}</div>
                      </div>

                      <div className="relative p-8 min-h-[280px] flex flex-col justify-between">
                        {/* Top section */}
                        <div>
                          <span className="text-5xl block mb-3">{selectedTemplate.emoji}</span>
                          <h3 className="text-2xl font-bold text-white mb-1">{selectedTemplate.label}</h3>
                        </div>

                        {/* Message text */}
                        <div className="my-4">
                          <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {text}
                          </p>
                        </div>

                        {/* Audio badge */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                            <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            <span className="text-white/80 text-xs font-medium">Voice Message</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audio player */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Generated Audio</label>
                  <AudioPlayer audioData={generatedAudio} sampleRate={SAMPLE_RATE} />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download WAV
                  </button>
                  <button
                    onClick={handleStartOver}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 text-sm font-medium hover:border-zinc-600 hover:text-white transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Start Over
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
