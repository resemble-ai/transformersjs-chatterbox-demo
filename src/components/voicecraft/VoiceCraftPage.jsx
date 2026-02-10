import { useState, useCallback, useMemo } from 'react'
import ModeHeader from '../layout/ModeHeader'
import ModelLoader from '../shared/ModelLoader'
import VoiceRecorder from '../shared/VoiceRecorder'
import AudioPlayer from '../shared/AudioPlayer'
import ExaggerationSlider from '../shared/ExaggerationSlider'
import GenerateButton from '../shared/GenerateButton'
import { useTTS } from '../../hooks/useTTS'
import { useModelStatus } from '../../hooks/useModelStatus'
import { useAppStore } from '../../store/app-store'
import { SAMPLE_RATE, CHARACTER_COLORS, DEFAULT_EXAGGERATION } from '../../lib/constants'
import { encodeWAV, downloadBlob, concatFloat32Arrays, createSilence } from '../../lib/audio-utils'

// ---------------------------------------------------------------------------
// Inline Sub-Components
// ---------------------------------------------------------------------------

function CharacterCard({ character, onUpdate, onRemove, colorIndex }) {
  const color = CHARACTER_COLORS[colorIndex % CHARACTER_COLORS.length]

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
      {/* Header row: color dot, name, remove */}
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-zinc-900"
          style={{ backgroundColor: color, ringColor: color }}
        />
        <input
          type="text"
          value={character.name}
          onChange={(e) => onUpdate({ ...character, name: e.target.value })}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-violet-500 transition-colors"
          placeholder="Character name"
        />
        <button
          onClick={onRemove}
          className="text-zinc-500 hover:text-red-400 transition-colors p-1"
          title="Remove character"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Voice recorder */}
      <VoiceRecorder
        label="Voice Sample"
        onVoiceReady={(data) => onUpdate({ ...character, voiceAudio: data })}
      />
    </div>
  )
}

function DialogueLine({ line, characters, onUpdate, onRemove, index }) {
  const selectedChar = characters.find((c) => c.id === line.characterId)
  const charColorIndex = characters.findIndex((c) => c.id === line.characterId)
  const color = charColorIndex >= 0
    ? CHARACTER_COLORS[charColorIndex % CHARACTER_COLORS.length]
    : '#71717a'

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
      {/* Line header */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-600 font-mono tabular-nums w-6 text-right shrink-0">
          {index + 1}
        </span>

        {/* Color indicator */}
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />

        {/* Character selector */}
        <select
          value={line.characterId}
          onChange={(e) => onUpdate({ ...line, characterId: e.target.value })}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-violet-500 transition-colors min-w-[140px]"
        >
          <option value="">Select character...</option>
          {characters.map((c, ci) => (
            <option key={c.id} value={c.id}>
              {c.name || `Character ${ci + 1}`}
            </option>
          ))}
        </select>

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="ml-auto text-zinc-500 hover:text-red-400 transition-colors p-1"
          title="Remove line"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Text input */}
      <textarea
        value={line.text}
        onChange={(e) => onUpdate({ ...line, text: e.target.value })}
        placeholder={selectedChar ? `${selectedChar.name} says...` : 'Write dialogue...'}
        rows={2}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
      />

      {/* Mini exaggeration slider */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-zinc-500 shrink-0">Emotion</label>
        <input
          type="range"
          min={0}
          max={1.5}
          step={0.05}
          value={line.exaggeration}
          onChange={(e) => onUpdate({ ...line, exaggeration: parseFloat(e.target.value) })}
          className="flex-1 accent-violet-500 h-1"
        />
        <span className="text-xs tabular-nums text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded w-10 text-center">
          {line.exaggeration.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

function DialogueTimeline({ lines, characters, generatedClips }) {
  // Calculate total duration from clips
  const segments = lines.map((line, i) => {
    const clip = generatedClips[line.id]
    const charIndex = characters.findIndex((c) => c.id === line.characterId)
    const color = charIndex >= 0
      ? CHARACTER_COLORS[charIndex % CHARACTER_COLORS.length]
      : '#71717a'
    const char = characters.find((c) => c.id === line.characterId)
    const durationSec = clip ? clip.length / SAMPLE_RATE : 0
    return { id: line.id, color, name: char?.name || '?', durationSec, index: i }
  })

  const totalDuration = segments.reduce((sum, s) => sum + s.durationSec, 0)
    + Math.max(0, segments.length - 1) * 0.5 // 0.5s gaps

  if (totalDuration === 0) return null

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">Dialogue Timeline</label>
      <div className="flex items-center gap-0.5 h-10 rounded-lg overflow-hidden bg-zinc-800 p-1">
        {segments.map((seg, i) => {
          const widthPct = totalDuration > 0
            ? ((seg.durationSec + (i < segments.length - 1 ? 0.5 : 0)) / totalDuration) * 100
            : 0
          return (
            <div
              key={seg.id}
              className="h-full rounded flex items-center justify-center overflow-hidden transition-all"
              style={{
                backgroundColor: seg.color + '33',
                borderLeft: `3px solid ${seg.color}`,
                width: `${widthPct}%`,
                minWidth: seg.durationSec > 0 ? '24px' : '0px',
              }}
              title={`${seg.name}: ${seg.durationSec.toFixed(1)}s`}
            >
              <span className="text-[10px] text-zinc-300 truncate px-1">
                {seg.name}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600">
        <span>0:00</span>
        <span>{formatDuration(totalDuration)}</span>
      </div>
    </div>
  )
}

function ProgressIndicator({ currentLineIndex, totalLines }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
      <svg className="animate-spin w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
      </svg>
      <div className="flex-1">
        <p className="text-sm font-medium text-violet-300">
          Generating line {currentLineIndex + 1} of {totalLines}...
        </p>
        <div className="mt-1.5 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${((currentLineIndex + 1) / totalLines) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Main VoiceCraft Page
// ---------------------------------------------------------------------------

export default function VoiceCraftPage() {
  const { isReady } = useModelStatus()
  const { encodeSpeaker, generate, isSpeakerEncoded } = useTTS()
  const voicecraft = useAppStore((s) => s.voicecraft)
  const setVoiceCraft = useAppStore((s) => s.setVoiceCraft)

  const { characters, lines, generatedClips, fullAudio, generating, currentLineIndex } = voicecraft

  // ---- Character Management ----

  const addCharacter = useCallback(() => {
    const nextColorIndex = characters.length
    const newChar = {
      id: crypto.randomUUID(),
      name: `Character ${characters.length + 1}`,
      color: CHARACTER_COLORS[nextColorIndex % CHARACTER_COLORS.length],
      voiceAudio: null,
    }
    setVoiceCraft({ characters: [...characters, newChar] })
  }, [characters, setVoiceCraft])

  const updateCharacter = useCallback((updated) => {
    setVoiceCraft({
      characters: characters.map((c) => (c.id === updated.id ? updated : c)),
    })
  }, [characters, setVoiceCraft])

  const removeCharacter = useCallback((id) => {
    setVoiceCraft({
      characters: characters.filter((c) => c.id !== id),
      // Clear lines referencing removed character
      lines: lines.map((l) =>
        l.characterId === id ? { ...l, characterId: '' } : l
      ),
    })
  }, [characters, lines, setVoiceCraft])

  // ---- Script Lines ----

  const addLine = useCallback(() => {
    const newLine = {
      id: crypto.randomUUID(),
      characterId: characters.length > 0 ? characters[0].id : '',
      text: '',
      exaggeration: DEFAULT_EXAGGERATION,
    }
    setVoiceCraft({ lines: [...lines, newLine] })
  }, [characters, lines, setVoiceCraft])

  const updateLine = useCallback((updated) => {
    setVoiceCraft({
      lines: lines.map((l) => (l.id === updated.id ? updated : l)),
    })
  }, [lines, setVoiceCraft])

  const removeLine = useCallback((id) => {
    const { [id]: _removed, ...remainingClips } = generatedClips
    setVoiceCraft({
      lines: lines.filter((l) => l.id !== id),
      generatedClips: remainingClips,
      fullAudio: null,
    })
  }, [lines, generatedClips, setVoiceCraft])

  // ---- Validation ----

  const validationErrors = useMemo(() => {
    const errors = []
    if (characters.length === 0) errors.push('Add at least one character.')
    if (lines.length === 0) errors.push('Add at least one dialogue line.')

    const charsWithoutVoice = characters.filter((c) => !c.voiceAudio)
    if (charsWithoutVoice.length > 0) {
      errors.push(`Record voice samples for: ${charsWithoutVoice.map((c) => c.name).join(', ')}`)
    }

    const linesWithoutChar = lines.filter((l) => !l.characterId)
    if (linesWithoutChar.length > 0) {
      errors.push(`Assign characters to all lines (${linesWithoutChar.length} unassigned).`)
    }

    const linesWithoutText = lines.filter((l) => !l.text.trim())
    if (linesWithoutText.length > 0) {
      errors.push(`Write text for all lines (${linesWithoutText.length} empty).`)
    }

    // Check that assigned characters still exist and have voice
    const charIds = new Set(characters.map((c) => c.id))
    const orphanedLines = lines.filter((l) => l.characterId && !charIds.has(l.characterId))
    if (orphanedLines.length > 0) {
      errors.push(`${orphanedLines.length} line(s) reference a removed character.`)
    }

    return errors
  }, [characters, lines])

  const canGenerate = isReady && validationErrors.length === 0 && !generating

  // ---- Generate All ----

  const handleGenerateAll = useCallback(async () => {
    if (!canGenerate) return

    setVoiceCraft({ generating: true, currentLineIndex: 0, fullAudio: null })
    const clips = {}

    try {
      // Track which speakers we have encoded in this run
      const encodedInRun = new Set()

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        setVoiceCraft({ currentLineIndex: i })

        const character = characters.find((c) => c.id === line.characterId)
        if (!character || !character.voiceAudio) continue

        // Encode speaker voice if not already cached
        const speakerId = `voicecraft-${character.id}`
        if (!isSpeakerEncoded(speakerId) && !encodedInRun.has(speakerId)) {
          await encodeSpeaker(speakerId, character.voiceAudio)
          encodedInRun.add(speakerId)
        }

        // Generate speech for this line
        const result = await generate(line.text, speakerId, line.exaggeration)
        clips[line.id] = result.waveform
      }

      // Concatenate all clips with 0.5s silence gaps
      const allParts = []
      const lineIds = lines.map((l) => l.id)
      for (let i = 0; i < lineIds.length; i++) {
        const clip = clips[lineIds[i]]
        if (clip) {
          if (allParts.length > 0) {
            allParts.push(createSilence(0.5))
          }
          allParts.push(clip)
        }
      }

      const concatenated = allParts.length > 0 ? concatFloat32Arrays(allParts) : null

      setVoiceCraft({
        generatedClips: clips,
        fullAudio: concatenated,
        generating: false,
        currentLineIndex: -1,
      })
    } catch (err) {
      console.error('VoiceCraft generation error:', err)
      setVoiceCraft({
        generatedClips: clips,
        generating: false,
        currentLineIndex: -1,
      })
    }
  }, [canGenerate, lines, characters, encodeSpeaker, generate, isSpeakerEncoded, setVoiceCraft])

  // ---- Export ----

  const handleExport = useCallback(() => {
    if (!fullAudio) return
    const wavBlob = encodeWAV(fullAudio, SAMPLE_RATE)
    downloadBlob(wavBlob, 'voicecraft-dialogue.wav')
  }, [fullAudio])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col min-h-full">
      <ModeHeader
        title="VoiceCraft"
        description="Create multi-character dialogues with unique voices"
      >
        <ModelLoader compact />
      </ModeHeader>

      <div className="max-w-5xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Model loader (shown when model not ready) */}
        {!isReady && (
          <ModelLoader />
        )}

        {/* ============================================================= */}
        {/* CHARACTER MANAGER                                              */}
        {/* ============================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">Characters</h3>
              <p className="text-sm text-zinc-500 mt-0.5">
                Add characters and record a voice sample for each
              </p>
            </div>
            <button
              onClick={addCharacter}
              disabled={characters.length >= CHARACTER_COLORS.length}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                characters.length >= CHARACTER_COLORS.length
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Character
            </button>
          </div>

          {characters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center">
              <p className="text-sm text-zinc-500">
                No characters yet. Click "Add Character" to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {characters.map((char, i) => (
                <CharacterCard
                  key={char.id}
                  character={char}
                  colorIndex={i}
                  onUpdate={updateCharacter}
                  onRemove={() => removeCharacter(char.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ============================================================= */}
        {/* SCRIPT EDITOR                                                  */}
        {/* ============================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">Script</h3>
              <p className="text-sm text-zinc-500 mt-0.5">
                Write dialogue lines and assign them to characters
              </p>
            </div>
            <button
              onClick={addLine}
              disabled={characters.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                characters.length === 0
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Line
            </button>
          </div>

          {lines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center">
              <p className="text-sm text-zinc-500">
                {characters.length === 0
                  ? 'Add characters first, then create dialogue lines.'
                  : 'No lines yet. Click "Add Line" to start writing dialogue.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {lines.map((line, i) => (
                <DialogueLine
                  key={line.id}
                  line={line}
                  characters={characters}
                  index={i}
                  onUpdate={updateLine}
                  onRemove={() => removeLine(line.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ============================================================= */}
        {/* GENERATION & EXPORT                                            */}
        {/* ============================================================= */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-100">Generate & Export</h3>

          {/* Validation errors */}
          {validationErrors.length > 0 && !generating && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
              {validationErrors.map((err, i) => (
                <p key={i} className="text-xs text-amber-400 flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </span>
                  {err}
                </p>
              ))}
            </div>
          )}

          {/* Progress indicator */}
          {generating && (
            <ProgressIndicator
              currentLineIndex={currentLineIndex}
              totalLines={lines.length}
            />
          )}

          {/* Generate button */}
          <GenerateButton
            onClick={handleGenerateAll}
            disabled={!canGenerate}
            generating={generating}
            label="Generate All Lines"
          />

          {/* Timeline */}
          {Object.keys(generatedClips).length > 0 && (
            <DialogueTimeline
              lines={lines}
              characters={characters}
              generatedClips={generatedClips}
            />
          )}

          {/* Audio player */}
          {fullAudio && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300">Full Dialogue</label>
              <AudioPlayer audioData={fullAudio} sampleRate={SAMPLE_RATE} />
            </div>
          )}

          {/* Export button */}
          {fullAudio && (
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Dialogue as WAV
            </button>
          )}
        </section>
      </div>
    </div>
  )
}
