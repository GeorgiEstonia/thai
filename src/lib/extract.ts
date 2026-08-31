import Anthropic from '@anthropic-ai/sdk'

import type { ExtractedWord } from './db/schema'

/**
 * Reads vocabulary off photographed textbook pages.
 *
 * The important behaviour is decomposition: a sentence on the page is kept
 * whole *and* broken into every content word inside it. A page showing
 * "คุณมีคนในครอบครัวกี่คน" should yield the sentence plus มี (to have),
 * ครอบครัว (family), คน (person/classifier) and กี่ (how many) as separate
 * cards — otherwise you can recite the sentence and still not have the words.
 */

const SYSTEM = `You extract Thai vocabulary from photographs of textbook pages.

Return two kinds of item:

1. kind "phrase" — full sentences or set expressions printed on the page, kept
   intact. Useful to learn as a unit.
2. kind "word" — EVERY distinct vocabulary item that appears, including each
   content word inside the sentences you returned as phrases. This is the most
   important part of the job. For a sentence meaning "How many people are in
   your family?" you must also emit the individual words for "to have",
   "family", "person", "how many", and any others present.

Rules:
- Transcribe ONLY Thai that is actually on the page. Never invent vocabulary.
  Decomposing a printed sentence into its words is not inventing.
- Copy Thai script exactly, including tone marks and vowel signs.
- Give each word in its dictionary form.
- Do not repeat the same Thai string twice with the same kind.
- IPA: use c/cʰ for จ and ฉ/ช, mark vowel length with ː, and include tone marks.
  If you cannot read a word confidently, return an empty ipa rather than guess.
- english: the gloss from the page if given, otherwise the ordinary meaning.
  For grammatical items say what they do, e.g. "classifier for people".
- notes: only genuinely useful context (classifier, register, literal reading).
  Otherwise null.
- confidence: "high" for clean print, "medium" if legible but uncertain, "low"
  if you are partly guessing at the glyphs.
- Read HANDWRITING as well as print. Lesson pages are annotated by hand, and
  those notes are usually the most valuable part. If handwriting is genuinely
  illegible, skip it rather than guessing — but do try.
- If the page already writes pronunciation in some notation, MATCH THAT
  NOTATION rather than imposing your own. Only fall back to standard IPA when
  the page gives no pronunciation at all.
- Skip page furniture: headings, lesson numbers, exercise instructions, page
  numbers, English-only text.`

const VERIFY_SYSTEM = `You are checking vocabulary that was just read off a photo
of a Thai lesson page, before it is added to a learner's deck unseen.

For each item decide whether it is safe to add:
- Is the Thai a real, well-formed Thai word or phrase? Reject OCR damage,
  broken glyph sequences, and stray characters.
- Does the gloss plausibly match the Thai?
- Is the pronunciation consistent with the Thai spelling?

Set verified true only if you would be comfortable with the learner drilling it
without ever checking it. Otherwise set verified false and put one short plain
sentence in issue saying what is wrong.

You may correct obvious small errors in ipa, english or notes while verifying;
do not change thai, and do not add or remove items. Return every item you were
given, in the same order.`

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          thai: { type: 'string' },
          ipa: { type: 'string' },
          english: { type: 'string' },
          kind: { type: 'string', enum: ['word', 'phrase'] },
          notes: { type: ['string', 'null'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          verified: { type: 'boolean' },
          issue: { type: ['string', 'null'] },
        },
        required: [
          'thai', 'ipa', 'english', 'kind', 'notes', 'confidence', 'verified', 'issue',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          thai: { type: 'string' },
          ipa: { type: 'string' },
          english: { type: 'string' },
          kind: { type: 'string', enum: ['word', 'phrase'] },
          notes: { type: ['string', 'null'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['thai', 'ipa', 'english', 'kind', 'notes', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const

/** Splits a data URL into the media type and raw base64 the API expects. */
export function parseDataUrl(dataUrl: string): { mediaType: string; data: string } {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl)
  if (!match) throw new Error('Expected a base64 data URL')
  return { mediaType: match[1], data: match[2] }
}

/**
 * Least-certain first — those need your eyes — and within that, words before
 * phrases, since the words are the part you actually have to learn.
 */
export function sortForReview(items: ExtractedWord[]): ExtractedWord[] {
  const byConfidence = { low: 0, medium: 1, high: 2 }
  const byKind = { word: 0, phrase: 1 }
  return [...items].sort(
    (a, b) =>
      byConfidence[a.confidence] - byConfidence[b.confidence] ||
      byKind[a.kind] - byKind[b.kind],
  )
}

/** Drops repeats of the same Thai string and kind, keeping the surest one. */
export function dedupe(items: ExtractedWord[]): ExtractedWord[] {
  const rank = { low: 0, medium: 1, high: 2 }
  const best = new Map<string, ExtractedWord>()

  for (const item of items) {
    const key = `${item.kind}:${item.thai.trim()}`
    const seen = best.get(key)
    if (!seen || rank[item.confidence] > rank[seen.confidence]) best.set(key, item)
  }

  return [...best.values()]
}

/**
 * Reads ONE page.
 *
 * Deliberately one page per call: a whole chapter in a single request runs
 * past the serverless function timeout and is killed with no error recorded,
 * which is exactly how batches were getting stuck.
 */
export async function extractWords(imageDataUrls: string[]): Promise<ExtractedWord[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set — add it to .env.local')
  }
  if (imageDataUrls.length === 0) return []

  const client = new Anthropic()

  // Streamed because the SDK refuses a non-streaming request whose max_tokens
  // could outrun the HTTP timeout, and a chapter needs a large budget.
  const stream = client.messages.stream({
    model: 'claude-opus-5',
    // Opus 5 thinks by default and max_tokens caps thinking plus output
    // together — a whole textbook chapter needs real headroom here.
    max_tokens: 32000,
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [
      {
        role: 'user',
        content: [
          ...imageDataUrls.map((dataUrl) => {
            const { mediaType, data } = parseDataUrl(dataUrl)
            return {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
                data,
              },
            }
          }),
          {
            type: 'text' as const,
            text: `Extract the Thai vocabulary from ${
              imageDataUrls.length === 1 ? 'this page' : `these ${imageDataUrls.length} pages`
            }. Remember to break every sentence into its individual words as well.`,
          },
        ],
      },
    ],
  })

  const response = await stream.finalMessage()

  if (response.stop_reason === 'refusal') throw new Error('The request was declined.')

  const text = response.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') throw new Error('No content returned')

  const parsed = JSON.parse(text.text) as { items: ExtractedWord[] }
  return sortForReview(dedupe(parsed.items))
}

/**
 * Second pass: a fresh look at the extracted list, so obviously-broken OCR
 * never reaches the deck.
 *
 * This is what makes unattended importing reasonable — you asked not to have to
 * check every page by hand, so something has to do that job. Items it is happy
 * with are filed automatically; the rest are held for you.
 */
export async function verifyItems(items: ExtractedWord[]): Promise<ExtractedWord[]> {
  if (items.length === 0) return []

  const client = new Anthropic()
  const stream = client.messages.stream({
    model: 'claude-opus-5',
    max_tokens: 32000,
    system: VERIFY_SYSTEM,
    output_config: { format: { type: 'json_schema', schema: VERIFY_SCHEMA } },
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          items: items.map(({ thai, ipa, english, kind, notes, confidence }) => ({
            thai,
            ipa,
            english,
            kind,
            notes,
            confidence,
          })),
        }),
      },
    ],
  })

  const response = await stream.finalMessage()
  if (response.stop_reason === 'refusal') throw new Error('The check was declined.')

  const text = response.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') throw new Error('No content returned')

  const checked = (JSON.parse(text.text) as { items: ExtractedWord[] }).items

  // Never trust the pass to have returned everything — fall back to holding
  // anything it dropped rather than silently losing it.
  return items.map((original) => {
    const match = checked.find((item) => item.thai.trim() === original.thai.trim())
    if (!match) return { ...original, verified: false, issue: 'Not checked' }
    return { ...original, ...match, thai: original.thai }
  })
}

/** Safe to file without you looking at it. */
export function isSafeToAdd(item: ExtractedWord): boolean {
  return item.verified === true && item.confidence !== 'low'
}
