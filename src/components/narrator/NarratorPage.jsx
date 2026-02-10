import { useState, useCallback, useRef, useMemo } from 'react'
import ModeHeader from '../layout/ModeHeader'
import ModelLoader from '../shared/ModelLoader'
import VoiceRecorder from '../shared/VoiceRecorder'
import AudioPlayer from '../shared/AudioPlayer'
import GenerateButton from '../shared/GenerateButton'
import { useTTS } from '../../hooks/useTTS'
import { useModelStatus } from '../../hooks/useModelStatus'
import { useAppStore } from '../../store/app-store'
import { SAMPLE_RATE, SAMPLE_STORIES } from '../../lib/constants'
import { encodeWAV, downloadBlob, concatFloat32Arrays, createSilence } from '../../lib/audio-utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DIALOGUE_REGEX = /"([^"]+)"\s*(?:,?\s*(?:said|asked|whispered|replied|muttered|exclaimed|shouted|cried))?\s*(\w+)?/g

function parseStoryIntoSegments(text) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const segments = []
  const characterSet = new Set()

  paragraphs.forEach((paragraph, pIdx) => {
    let lastIndex = 0
    const matches = [...paragraph.matchAll(DIALOGUE_REGEX)]

    if (matches.length === 0) {
      segments.push({
        type: 'narration',
        text: paragraph,
        character: null,
        paragraphIndex: pIdx,
      })
      return
    }

    matches.forEach((match) => {
      const matchStart = match.index
      const matchEnd = matchStart + match[0].length

      // Narration text before this dialogue
      if (matchStart > lastIndex) {
        const before = paragraph.slice(lastIndex, matchStart).trim()
        if (before) {
          segments.push({
            type: 'narration',
            text: before,
            character: null,
            paragraphIndex: pIdx,
          })
        }
      }

      const dialogueText = match[1]
      const speakerName = match[2] || null

      if (speakerName) {
        const capitalized =
          speakerName.charAt(0).toUpperCase() + speakerName.slice(1)
        characterSet.add(capitalized)
        segments.push({
          type: 'dialogue',
          text: dialogueText,
          character: capitalized,
          paragraphIndex: pIdx,
        })
      } else {
        segments.push({
          type: 'dialogue',
          text: dialogueText,
          character: null,
          paragraphIndex: pIdx,
        })
      }

      lastIndex = matchEnd
    })

    // Narration after the last dialogue match
    if (lastIndex < paragraph.length) {
      const after = paragraph.slice(lastIndex).trim()
      if (after) {
        segments.push({
          type: 'narration',
          text: after,
          character: null,
          paragraphIndex: pIdx,
        })
      }
    }
  })

  return { segments, characters: [...characterSet] }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StorySelector({ storyId, customText, onSelectStory, onCustomTextChange }) {
  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-zinc-300">Choose a sample story</label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SAMPLE_STORIES.map((story) => (
          <button
            key={story.id}
            onClick={() => onSelectStory(story.id)}
            className={`text-left p-4 rounded-xl border transition-all ${
              storyId === story.id
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700'
            }`}
          >
            <span className="text-sm font-medium block mb-1">{story.title}</span>
            <span className="text-xs text-zinc-500 line-clamp-2">
              {story.text.slice(0, 80)}...
            </span>
          </button>
        ))}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-zinc-950 px-3 text-xs text-zinc-600">or paste your own</span>
        </div>
      </div>

      <textarea
        value={customText}
        onChange={(e) => onCustomTextChange(e.target.value)}
        placeholder="Paste or type a story here... Separate paragraphs with blank lines. Use quotation marks for dialogue."
        rows={6}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none resize-y"
      />
    </div>
  )
}

function VoiceAssigner({
  characters,
  voiceAssignments,
  onVoiceReady,
  onCharacterRename,
}) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-medium text-zinc-300">Assign Voices</h3>

      {/* Narrator voice */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-sm font-medium text-violet-300">Narrator</span>
        </div>
        <VoiceRecorder
          label="Narrator voice sample"
          onVoiceReady={(data) => onVoiceReady('__narrator__', data)}
        />
        {voiceAssignments['__narrator__'] && (
          <span className="text-xs text-green-400">Voice assigned</span>
        )}
      </div>

      {/* Character voices */}
      {characters.map((name, idx) => (
        <div
          key={`${name}-${idx}`}
          className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: characterColor(idx) }}
            />
            <input
              value={name}
              onChange={(e) => onCharacterRename(idx, e.target.value)}
              className="bg-transparent border-b border-zinc-700 text-sm font-medium text-zinc-200 focus:border-amber-500 focus:outline-none px-1 py-0.5"
            />
            <span className="text-xs text-zinc-600 ml-auto">Character</span>
          </div>
          <VoiceRecorder
            label={`Voice for ${name}`}
            onVoiceReady={(data) => onVoiceReady(name, data)}
          />
          {voiceAssignments[name] && (
            <span className="text-xs text-green-400">Voice assigned</span>
          )}
        </div>
      ))}

      {characters.length === 0 && (
        <p className="text-xs text-zinc-600">
          No character dialogue detected. Only the narrator voice will be used.
        </p>
      )}
    </div>
  )
}

function ProgressBar({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>
          Generating segment {current} of {total}...
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ReadAlongDisplay({ segments, currentSegment, generatedClips }) {
  const paragraphs = useMemo(() => {
    const map = new Map()
    segments.forEach((seg, idx) => {
      const pIdx = seg.paragraphIndex
      if (!map.has(pIdx)) map.set(pIdx, [])
      map.get(pIdx).push({ ...seg, segmentIndex: idx })
    })
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [segments])

  const [viewParagraph, setViewParagraph] = useState(0)

  // Auto-follow: jump to the paragraph containing the current segment
  const activeParagraphIndex = useMemo(() => {
    if (currentSegment < 0 || currentSegment >= segments.length) return null
    return segments[currentSegment].paragraphIndex
  }, [currentSegment, segments])

  const displayIdx = activeParagraphIndex !== null ? activeParagraphIndex : viewParagraph

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-300">Read Along</h3>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 min-h-[200px]">
        {paragraphs.map(([pIdx, segs]) => (
          <div
            key={pIdx}
            className={`mb-4 last:mb-0 transition-opacity duration-300 ${
              pIdx === displayIdx ? 'opacity-100' : 'opacity-30'
            }`}
          >
            <p className="text-sm leading-relaxed">
              {segs.map((seg) => {
                const isActive = seg.segmentIndex === currentSegment
                const isGenerated = !!generatedClips[seg.segmentIndex]

                if (seg.type === 'dialogue') {
                  return (
                    <span
                      key={seg.segmentIndex}
                      className={`inline rounded px-1 py-0.5 transition-colors ${
                        isActive
                          ? 'bg-amber-500/25 text-amber-200'
                          : isGenerated
                            ? 'text-amber-400/80'
                            : 'text-amber-400/50'
                      }`}
                    >
                      &ldquo;{seg.text}&rdquo;
                      {seg.character && (
                        <span className="text-xs text-zinc-500 ml-1">
                          &mdash; {seg.character}
                        </span>
                      )}
                    </span>
                  )
                }

                return (
                  <span
                    key={seg.segmentIndex}
                    className={`inline rounded px-0.5 transition-colors ${
                      isActive
                        ? 'bg-violet-500/20 text-zinc-100'
                        : isGenerated
                          ? 'text-zinc-300'
                          : 'text-zinc-400'
                    }`}
                  >
                    {seg.text}{' '}
                  </span>
                )
              })}
            </p>
          </div>
        ))}
      </div>

      {/* Paragraph navigation */}
      {paragraphs.length > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              setViewParagraph((v) => Math.max(0, (activeParagraphIndex ?? v) - 1))
            }
            disabled={displayIdx === 0}
            className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Prev Paragraph
          </button>
          <span className="text-xs text-zinc-600">
            Paragraph {displayIdx + 1} of {paragraphs.length}
          </span>
          <button
            onClick={() =>
              setViewParagraph((v) =>
                Math.min(paragraphs.length - 1, (activeParagraphIndex ?? v) + 1)
              )
            }
            disabled={displayIdx === paragraphs.length - 1}
            className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next Paragraph
          </button>
        </div>
      )}
    </div>
  )
}

// Colour helper -- repeats if many characters
const CHAR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
]
function characterColor(idx) {
  return CHAR_COLORS[idx % CHAR_COLORS.length]
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function NarratorPage() {
  const { isReady } = useModelStatus()
  const { encodeSpeaker, generate, isSpeakerEncoded } = useTTS()

  const narrator = useAppStore((s) => s.narrator)
  const setNarrator = useAppStore((s) => s.setNarrator)

  const {
    storyId,
    customText,
    segments,
    characters,
    voiceAssignments,
    generatedClips,
    fullAudio,
    generating,
    currentSegment,
  } = narrator

  const abortRef = useRef(false)

  // ---- Story selection ----
  const handleSelectStory = useCallback(
    (id) => {
      const story = SAMPLE_STORIES.find((s) => s.id === id)
      if (!story) return
      setNarrator({
        storyId: id,
        customText: story.text,
        segments: [],
        characters: [],
        generatedClips: {},
        fullAudio: null,
        currentSegment: -1,
      })
    },
    [setNarrator]
  )

  const handleCustomTextChange = useCallback(
    (text) => {
      setNarrator({
        storyId: null,
        customText: text,
        segments: [],
        characters: [],
        generatedClips: {},
        fullAudio: null,
        currentSegment: -1,
      })
    },
    [setNarrator]
  )

  // ---- Parse story ----
  const handleParseStory = useCallback(() => {
    const text = customText.trim()
    if (!text) return
    const { segments: segs, characters: chars } = parseStoryIntoSegments(text)
    setNarrator({
      segments: segs,
      characters: chars,
      generatedClips: {},
      fullAudio: null,
      currentSegment: -1,
    })
  }, [customText, setNarrator])

  // ---- Voice assignment ----
  const handleVoiceReady = useCallback(
    (name, audioData) => {
      setNarrator({
        voiceAssignments: {
          ...voiceAssignments,
          [name]: audioData,
        },
      })
    },
    [voiceAssignments, setNarrator]
  )

  const handleCharacterRename = useCallback(
    (idx, newName) => {
      const oldName = characters[idx]
      const updated = [...characters]
      updated[idx] = newName

      // Migrate voice assignment
      const assignments = { ...voiceAssignments }
      if (assignments[oldName]) {
        assignments[newName] = assignments[oldName]
        delete assignments[oldName]
      }

      // Migrate clips keyed to old character name
      const updatedClips = { ...generatedClips }

      // Update character references in segments
      const updatedSegments = segments.map((seg) =>
        seg.character === oldName ? { ...seg, character: newName } : seg
      )

      setNarrator({
        characters: updated,
        voiceAssignments: assignments,
        generatedClips: updatedClips,
        segments: updatedSegments,
      })
    },
    [characters, voiceAssignments, generatedClips, segments, setNarrator]
  )

  // ---- Generation ----
  const speakerIdFor = useCallback(
    (segment) => {
      if (segment.type === 'narration' || !segment.character) {
        return 'narrator__voice'
      }
      return `narrator__char__${segment.character}`
    },
    []
  )

  const handleGenerateAll = useCallback(async () => {
    if (segments.length === 0) return
    abortRef.current = false
    setNarrator({ generating: true, fullAudio: null, currentSegment: 0 })

    const clips = {}
    try {
      for (let i = 0; i < segments.length; i++) {
        if (abortRef.current) break

        setNarrator({ currentSegment: i })

        const seg = segments[i]
        const spkId = speakerIdFor(seg)

        // Encode speaker if needed
        if (!isSpeakerEncoded(spkId)) {
          const voiceKey =
            seg.type === 'narration' || !seg.character
              ? '__narrator__'
              : seg.character
          const voiceData = voiceAssignments[voiceKey]
          if (voiceData) {
            await encodeSpeaker(spkId, voiceData)
          }
        }

        const result = await generate(seg.text, spkId, 0.5)
        clips[i] = result.waveform

        // Update store incrementally so the UI reflects progress
        setNarrator({ generatedClips: { ...clips } })
      }

      if (!abortRef.current) {
        // Concatenate all clips with short silences between segments
        const SEGMENT_SILENCE = 0.3 // seconds
        const PARAGRAPH_SILENCE = 0.8 // seconds

        const allParts = []
        const segKeys = Object.keys(clips)
          .map(Number)
          .sort((a, b) => a - b)

        segKeys.forEach((idx, i) => {
          allParts.push(clips[idx])
          if (i < segKeys.length - 1) {
            const currPara = segments[idx].paragraphIndex
            const nextPara = segments[segKeys[i + 1]].paragraphIndex
            const silenceDur =
              nextPara !== currPara ? PARAGRAPH_SILENCE : SEGMENT_SILENCE
            allParts.push(createSilence(silenceDur))
          }
        })

        const full = concatFloat32Arrays(allParts)
        setNarrator({ fullAudio: full, currentSegment: -1 })
      }
    } catch (err) {
      console.error('Narrator generation error:', err)
    } finally {
      setNarrator({ generating: false })
    }
  }, [
    segments,
    voiceAssignments,
    speakerIdFor,
    isSpeakerEncoded,
    encodeSpeaker,
    generate,
    setNarrator,
  ])

  const handleAbort = useCallback(() => {
    abortRef.current = true
  }, [])

  // ---- Export ----
  const handleExport = useCallback(() => {
    if (!fullAudio) return
    const blob = encodeWAV(fullAudio, SAMPLE_RATE)
    const title =
      SAMPLE_STORIES.find((s) => s.id === storyId)?.title || 'narration'
    const safeName = title.toLowerCase().replace(/\s+/g, '-')
    downloadBlob(blob, `${safeName}.wav`)
  }, [fullAudio, storyId])

  // ---- Derived state ----
  const isParsed = segments.length > 0
  const hasNarratorVoice = !!voiceAssignments['__narrator__']
  const allCharactersAssigned =
    characters.length === 0 ||
    characters.every((c) => !!voiceAssignments[c])
  const canGenerate =
    isReady && isParsed && hasNarratorVoice && allCharactersAssigned && !generating

  const generatedCount = Object.keys(generatedClips).length

  // ---- Render ----
  return (
    <div className="min-h-screen">
      <ModeHeader
        title="Narrator"
        description="Turn stories into narrated audiobooks with character voices"
      />

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Model loader */}
        <ModelLoader compact />

        {/* ===== STEP 1: Story Input ===== */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold">
              1
            </span>
            <h3 className="text-base font-semibold text-zinc-200">
              Select a Story
            </h3>
          </div>

          <StorySelector
            storyId={storyId}
            customText={customText}
            onSelectStory={handleSelectStory}
            onCustomTextChange={handleCustomTextChange}
          />

          <button
            onClick={handleParseStory}
            disabled={!customText.trim()}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              customText.trim()
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            Parse Story
          </button>

          {isParsed && (
            <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
              <span>
                {segments.length} segment{segments.length !== 1 && 's'}
              </span>
              <span>
                {segments.filter((s) => s.type === 'dialogue').length} dialogue
              </span>
              <span>
                {segments.filter((s) => s.type === 'narration').length} narration
              </span>
              {characters.length > 0 && (
                <span>
                  {characters.length} character{characters.length !== 1 && 's'}:{' '}
                  {characters.join(', ')}
                </span>
              )}
            </div>
          )}
        </section>

        {/* ===== STEP 2: Voice Assignment ===== */}
        {isParsed && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold">
                2
              </span>
              <h3 className="text-base font-semibold text-zinc-200">
                Assign Voices
              </h3>
            </div>

            <VoiceAssigner
              characters={characters}
              voiceAssignments={voiceAssignments}
              onVoiceReady={handleVoiceReady}
              onCharacterRename={handleCharacterRename}
            />
          </section>
        )}

        {/* ===== STEP 3: Generate ===== */}
        {isParsed && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold">
                3
              </span>
              <h3 className="text-base font-semibold text-zinc-200">
                Generate Narration
              </h3>
            </div>

            {!hasNarratorVoice && (
              <p className="text-xs text-amber-400/70">
                Please record or upload a narrator voice sample above before generating.
              </p>
            )}
            {!allCharactersAssigned && hasNarratorVoice && (
              <p className="text-xs text-amber-400/70">
                Please assign voices for all detected characters before generating.
              </p>
            )}

            {generating ? (
              <div className="space-y-3">
                <ProgressBar
                  current={currentSegment + 1}
                  total={segments.length}
                />
                <button
                  onClick={handleAbort}
                  className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <GenerateButton
                onClick={handleGenerateAll}
                disabled={!canGenerate}
                generating={generating}
                label={
                  generatedCount > 0 && !fullAudio
                    ? `Regenerate All (${generatedCount}/${segments.length} done)`
                    : 'Generate All'
                }
              />
            )}
          </section>
        )}

        {/* ===== STEP 4: Read-Along + Playback ===== */}
        {isParsed && generatedCount > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold">
                4
              </span>
              <h3 className="text-base font-semibold text-zinc-200">
                Read Along
              </h3>
            </div>

            <ReadAlongDisplay
              segments={segments}
              currentSegment={currentSegment}
              generatedClips={generatedClips}
            />

            {/* Full narration audio player */}
            {fullAudio && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-zinc-300">
                  Full Narration
                </h4>
                <AudioPlayer audioData={fullAudio} sampleRate={SAMPLE_RATE} />

                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-zinc-300 hover:border-zinc-600 transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="w-4 h-4"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export as WAV
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
