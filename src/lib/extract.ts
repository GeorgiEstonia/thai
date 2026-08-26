import Anthropic from '@anthropic-ai/sdk'

import type { ExtractedWord } from './db/schema'

/**
 * Pulls vocabulary off a photographed lesson page.
 *
 * Deliberately conservative: it is told to transcribe only what is printed,
 * to leave IPA empty rather than guess, and to mark its own confidence. The
 * output is a proposal — nothing reaches the deck without your approval —
 * because a wrong card rehearsed for weeks is worse than a missing one.
 */

const SYSTEM = `You extract Thai vocabulary from photographs of language-lesson pages.

Rules:
- Transcribe ONLY what is actually printed or written on the page. Never invent
  vocabulary, and never "helpfully" add related words.
- Thai script must be copied exactly, including tone marks and vowel signs.
- Give IPA using c/cʰ for จ and ฉ/ช, and mark vowel length with ː. If you cannot
  read the word confidently enough to transcribe it, return an empty ipa string
  rather than guessing.
- english: the gloss as given on the page. If the page gives no translation,
  supply the ordinary meaning.
- notes: only genuinely useful extra context that is ON the page (register,
  classifier, example usage). Otherwise null.
- confidence: "high" when the print is clean and unambiguous, "medium" when
  legible but uncertain, "low" when you are partly guessing at the glyphs.
- Skip page furniture: headings, lesson numbers, exercise instructions,
  page numbers, and any text that is not vocabulary.`

const SCHEMA = {
  type: 'object',
  properties: {
    words: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          thai: { type: 'string' },
          ipa: { type: 'string' },
          english: { type: 'string' },
          notes: { type: ['string', 'null'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['thai', 'ipa', 'english', 'notes', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['words'],
  additionalProperties: false,
} as const

/** Splits a data URL into the media type and raw base64 the API expects. */
export function parseDataUrl(dataUrl: string): { mediaType: string; data: string } {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl)
  if (!match) throw new Error('Expected a base64 data URL')
  return { mediaType: match[1], data: match[2] }
}

export async function extractWords(imageDataUrl: string): Promise<ExtractedWord[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set — add it to .env.local')
  }

  const { mediaType, data } = parseDataUrl(imageDataUrl)
  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-opus-5',
    // Opus 5 thinks by default, and max_tokens caps thinking plus output
    // together — a tight limit here truncates the word list, not the thinking.
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
              data,
            },
          },
          { type: 'text', text: 'Extract the Thai vocabulary from this lesson page.' },
        ],
      },
    ],
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('The request was declined.')
  }

  const text = response.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') throw new Error('No content returned')

  const parsed = JSON.parse(text.text) as { words: ExtractedWord[] }
  return sortByConfidence(parsed.words)
}

/**
 * Least-certain first — those are the ones that need your eyes, and putting
 * them at the top of the review list is the whole point of asking the model to
 * rate its own confidence.
 */
export function sortByConfidence(words: ExtractedWord[]): ExtractedWord[] {
  const rank = { low: 0, medium: 1, high: 2 }
  return [...words].sort((a, b) => rank[a.confidence] - rank[b.confidence])
}
