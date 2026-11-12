import { describe, expect, it } from 'vitest'

import { type WordRecord, cardKey } from '@/content/items'
import { LESSON_SETS } from '@/content/lessons'

import { buildLexicon } from './lexicon'
import type { SrsState } from './srs'
import { UNLOCK_ALLOWANCE_GLOSSED, gateFor, isGlossable, learnedWords } from './unlock'

/**
 * The gate against the sentences the app actually ships.
 *
 * A unit test can show the rule does what it says; only the real content can
 * show the rule is worth having. The first two versions of this gate both
 * passed their unit tests and still left nearly every sentence locked, which
 * is the failure these guard against.
 *
 * The deck is simulated rather than read from a database: a fixed share of
 * the shipped words marked as recalled once, picked deterministically so the
 * numbers do not move between runs.
 */

/** Every shipped lesson item as a deck row. */
function shippedDeck(): WordRecord[] {
  return LESSON_SETS.flatMap((set) =>
    set.items.map((item, index) => ({
      id: `${set.id}-${index}`,
      thai: item.thai,
      ipa: item.ipa ?? '',
      english: item.english,
      kind: (item.kind ?? 'word') as 'word' | 'phrase',
      pack: set.pack ?? null,
      notes: null,
    })),
  )
}

function progressForShare(words: WordRecord[], share: number): Map<string, SrsState> {
  const known = words.filter(
    (word, index) => word.kind === 'word' && (index * 2654435761) % 1000 < share * 1000,
  )
  return new Map(
    known.map((word) => [
      cardKey('word', word.id, 'recognise'),
      { intervalDays: 1, dueAt: new Date(), reps: 1, lapses: 0 },
    ]),
  )
}

function survey(share: number) {
  const words = shippedDeck()
  const phrases = words.filter((word) => word.kind === 'phrase')
  const lexicon = buildLexicon(words)
  const learned = learnedWords(words, progressForShare(words, share))

  const gates = phrases.map((phrase) => gateFor(phrase, words, learned, lexicon))
  const open = gates.filter((gate) => gate.unlocked)

  return {
    phrases: phrases.length,
    open: open.length,
    carried: open.reduce((sum, gate) => sum + gate.blockedBy.length, 0),
    worst: Math.max(0, ...open.map((gate) => gate.blockedBy.length)),
    unsplittable: phrases.filter((phrase) => !isGlossable(phrase, lexicon)).length,
  }
}

describe('the gate on the shipped sentences', () => {
  it('splits every sentence it ships, so every one of them can be looked up', () => {
    // The loose limits assume a gloss is one tap away. If this ever fails,
    // the gate silently tightens on whatever stopped splitting.
    expect(survey(0.4).unsplittable).toBe(0)
  })

  it('opens most of them part-way through the deck', () => {
    // Roughly where the deck stands: a bit under half the words met once.
    const { open, phrases } = survey(0.42)
    expect(open / phrases).toBeGreaterThan(0.6)
  })

  it('opens some of them very early on', () => {
    const { open } = survey(0.1)
    expect(open).toBeGreaterThan(10)
  })

  it('still asks for about one new word per sentence, not five', () => {
    // The loose gate is for meeting words in context, not for handing over
    // the rest of the deck inside sentences.
    const { open, carried, worst } = survey(0.42)
    expect(carried / open).toBeLessThan(1.5)
    expect(worst).toBeLessThanOrEqual(UNLOCK_ALLOWANCE_GLOSSED)
  })

  it('opens everything once the words are known', () => {
    const { open, phrases } = survey(1)
    expect(open).toBe(phrases)
  })
})
