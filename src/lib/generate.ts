import Anthropic from '@anthropic-ai/sdk'

import type { WordRecord } from '@/content/items'

/**
 * Generates vocabulary on a topic, pitched at the level of what you already
 * know and excluding anything already in the deck.
 *
 * The existing words are sent as both the level signal and the exclusion list,
 * so this gets more useful — not more repetitive — as the deck grows.
 */

const SYSTEM = `You suggest Thai vocabulary for a learner's spaced-repetition deck.

You are given the learner's existing deck and a topic. Return new vocabulary on
that topic which:
- Is NOT already in the deck, in any form.
- Matches the difficulty of the existing deck. Judge that from the words given:
  a deck of pronouns and numbers is a beginner; a deck of abstract nouns is not.
  If the deck is nearly empty, assume a beginner and give the most frequent,
  most useful words on the topic.
- Is genuinely useful in everyday spoken Thai. Prefer what someone living in
  Thailand would actually hear and say over textbook curiosities.

For each item: correct Thai script, IPA (c/cʰ for จ and ฉ/ช, ː for long vowels,
tone marks), a short English gloss, and notes only where genuinely helpful
(classifier, register, a literal reading that aids memory). Mark kind "phrase"
for set expressions and sentences, "word" otherwise.`

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
        },
        required: ['thai', 'ipa', 'english', 'kind', 'notes'],
        additionalProperties: false,
      },
    },
    level: { type: 'string' },
  },
  required: ['items', 'level'],
  additionalProperties: false,
} as const

export interface GeneratedWord {
  thai: string
  ipa: string
  english: string
  kind: 'word' | 'phrase'
  notes: string | null
}

export interface GenerationResult {
  items: GeneratedWord[]
  /** The model's read on your current level, shown so you can sanity-check it. */
  level: string
}

export async function generateWords(
  topic: string,
  existing: WordRecord[],
  count: number,
): Promise<GenerationResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set — add it to .env.local')
  }

  const client = new Anthropic()
  const stream = client.messages.stream({
    model: 'claude-opus-5',
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          topic,
          howMany: count,
          existingDeck: existing.map((word) => ({ thai: word.thai, english: word.english })),
        }),
      },
    ],
  })

  const response = await stream.finalMessage()
  if (response.stop_reason === 'refusal') throw new Error('The request was declined.')

  const text = response.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') throw new Error('No content returned')

  const parsed = JSON.parse(text.text) as GenerationResult

  // Belt and braces: drop anything already held, whatever the model said.
  const have = new Set(existing.map((word) => word.thai.trim()))
  return { ...parsed, items: parsed.items.filter((item) => !have.has(item.thai.trim())) }
}
