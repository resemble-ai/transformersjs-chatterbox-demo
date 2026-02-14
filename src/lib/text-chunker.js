import { MAX_CHUNK_CHARS } from './constants'

// Abbreviations that shouldn't trigger sentence splits
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'ave', 'blvd',
  'gen', 'gov', 'sgt', 'cpl', 'pvt', 'capt', 'lt', 'col', 'maj',
  'etc', 'vs', 'vol', 'dept', 'est', 'approx', 'inc', 'ltd', 'co',
  'no', 'fig', 'ed', 'trans', 'rev', 'e.g', 'i.e',
])

/**
 * Split text into sentence-sized chunks suitable for TTS generation.
 * Each chunk is annotated with a type so concatenation can insert
 * appropriate silence gaps.
 *
 * @param {string} text
 * @param {number} maxChars
 * @returns {{ text: string, type: 'paragraph_start' | 'sentence' }[]}
 */
export function splitTextIntoChunks(text, maxChars = MAX_CHUNK_CHARS) {
  const trimmed = text.trim()
  if (!trimmed) return []

  const manualChunks = trimmed
    .split('|')
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  if (manualChunks.length > 1) {
    const chunks = []

    manualChunks.forEach((manualChunk, index) => {
      const splitChunk = splitTextIntoChunks(manualChunk, maxChars)
      if (splitChunk.length === 0) return

      // Only the first chunk in the entire response should start a paragraph
      if (index > 0 && splitChunk[0]?.type === 'paragraph_start') {
        splitChunk[0] = { ...splitChunk[0], type: 'sentence' }
      }

      chunks.push(...splitChunk)
    })

    return chunks
  }

  // If the whole text fits, return as a single chunk
  if (trimmed.length <= maxChars) {
    return [{ text: trimmed, type: 'paragraph_start' }]
  }

  const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim())
  const chunks = []

  for (const paragraph of paragraphs) {
    const para = paragraph.trim()
    if (!para) continue

    const isFirstChunkOfParagraph = true
    const sentences = splitIntoSentences(para)

    let first = true
    for (const sentence of sentences) {
      const type = first && isFirstChunkOfParagraph ? 'paragraph_start' : 'sentence'
      first = false

      if (sentence.length <= maxChars) {
        chunks.push({ text: sentence, type })
      } else {
        // Sentence too long — split at clause boundaries
        const clauses = splitAtClauses(sentence, maxChars)
        clauses.forEach((clause, i) => {
          chunks.push({
            text: clause,
            type: i === 0 ? type : 'sentence',
          })
        })
      }
    }
  }

  return chunks
}

/**
 * Split a paragraph into sentences, respecting common abbreviations.
 */
function splitIntoSentences(text) {
  const sentences = []
  let current = ''

  for (let i = 0; i < text.length; i++) {
    current += text[i]

    // Check for sentence-ending punctuation followed by space or end
    if ('.!?'.includes(text[i]) && (i === text.length - 1 || /\s/.test(text[i + 1]))) {
      // Check if this period is part of an abbreviation
      if (text[i] === '.' && isAbbreviation(current)) {
        continue
      }
      sentences.push(current.trim())
      current = ''
    }
  }

  // Remaining text
  if (current.trim()) {
    sentences.push(current.trim())
  }

  return sentences.filter(Boolean)
}

/**
 * Check if the current buffer ends with a known abbreviation.
 */
function isAbbreviation(buffer) {
  // Extract the last word before the period
  const match = buffer.match(/(\S+)\.$/)
  if (!match) return false
  const word = match[1].replace(/\.$/, '').toLowerCase()
  return ABBREVIATIONS.has(word)
}

/**
 * Split a long sentence at clause boundaries (commas, semicolons, colons, em-dashes).
 * Falls back to word boundaries if clauses are still too long.
 */
function splitAtClauses(text, maxChars) {
  const parts = text.split(/(?<=[,;:\u2014])\s+/)
  return mergePartsToFit(parts, maxChars)
}

/**
 * Merge an array of small parts into chunks that fit within maxChars.
 * If any single part exceeds maxChars, split it at word boundaries.
 */
function mergePartsToFit(parts, maxChars) {
  const result = []
  let current = ''

  for (const part of parts) {
    if (part.length > maxChars) {
      // Flush current buffer
      if (current.trim()) {
        result.push(current.trim())
        current = ''
      }
      // Split this oversized part at word boundaries
      const words = part.split(/\s+/)
      for (const word of words) {
        if (current && (current + ' ' + word).length > maxChars) {
          result.push(current.trim())
          current = word
        } else {
          current = current ? current + ' ' + word : word
        }
      }
    } else if (current && (current + ' ' + part).length > maxChars) {
      result.push(current.trim())
      current = part
    } else {
      current = current ? current + ' ' + part : part
    }
  }

  if (current.trim()) {
    result.push(current.trim())
  }

  return result
}
