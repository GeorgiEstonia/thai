import { DIRECTIONS, type WordRecord, cardKey } from '@/content/items'

import type { SrsState } from './srs'

/**
 * Phrases are not independent items.
 *
 * A sentence you can't read is not a hard card — it is several unlearned words
 * wearing a trench coat. You miss it, the whole thing resets, and you learn
 * nothing about which part you didn't know. So a phrase waits until each of
 * its words has been recalled correctly at least once, and only then does it
 * stop being a vocabulary test and become what it should be: practice at
 * putting known words together.
 *
 * This is i+1 made mechanical — every phrase you are shown is one step past
 * what you already have, never five.
 *
 * "One step past" is the whole point, and for a long time the code did not
 * allow it: a phrase waited until *every* word in it was known, which is i+0,
 * not i+1. With eighty words recalled and five hundred in the deck, that
 * locked 174 of 176 sentences — the gate was not gating, it was a wall. One
 * unknown word is now allowed through, which is the thing the paragraph above
 * always claimed to describe.
 */

/** One correct recall. Deliberately low: the gate is "met it", not "owns it". */
export const UNLOCK_INTERVAL_DAYS = 1

/**
 * Unknown words a phrase may still contain and be shown anyway.
 *
 * One, so a sentence is always at most one new word past what you have. Zero
 * is not a stricter version of this idea but a different one, and it starves:
 * a four-word sentence needs all four words to land in your known set by
 * coincidence, which for a deck much larger than your progress almost never
 * happens.
 */
export const UNLOCK_ALLOWANCE = 1

/**
 * The shortest Thai string worth matching inside a phrase.
 *
 * Single characters turn up inside almost every phrase by coincidence, and a
 * component matched by coincidence locks a phrase for a reason that isn't real.
 */
const MIN_COMPONENT_LENGTH = 2

/**
 * The words a phrase is built from.
 *
 * Found by looking for known vocabulary inside the phrase. Thai is written
 * without spaces between words, which makes substring matching workable here
 * in a way it would not be in English — there is no risk of matching across a
 * word boundary that doesn't exist.
 *
 * This deliberately needs nothing stored alongside the phrase, so it works on
 * the vocabulary already in the deck rather than only on phrases created from
 * now on.
 */
export function componentsOf(phrase: WordRecord, vocabulary: WordRecord[]): string[] {
  const found = new Set<string>()

  for (const word of vocabulary) {
    if (word.kind !== 'word') continue
    if (word.thai.length < MIN_COMPONENT_LENGTH) continue
    if (word.thai === phrase.thai) continue
    if (phrase.thai.includes(word.thai)) found.add(word.thai)
  }

  // A set, because the same word can be in the deck more than once — imported
  // from two different worksheets, say — and listing it twice as a thing you
  // still need reads as a mistake.
  const matches = [...found]

  // Keep only the longest reading of each stretch of text. Without spaces to
  // separate words, a short word is often a substring of a longer one that is
  // genuinely there — มา ("come") sits inside หมา ("dog") — and counting the
  // short one makes a phrase wait on a word that never appears in it.
  return matches.filter(
    (candidate) =>
      !matches.some((other) => other !== candidate && other.includes(candidate)),
  )
}

/**
 * Thai forms recalled correctly at least once, in either direction.
 *
 * Either direction counts. Reading a word and producing it are scheduled
 * separately because they are separate skills, but as evidence of "you have
 * met this word", either one will do.
 */
export function learnedWords(
  vocabulary: WordRecord[],
  progress: Map<string, SrsState>,
): Set<string> {
  const learned = new Set<string>()

  for (const word of vocabulary) {
    if (word.kind !== 'word') continue
    const best = Math.max(
      ...DIRECTIONS.map(
        (direction) => progress.get(cardKey('word', word.id, direction))?.intervalDays ?? 0,
      ),
    )
    if (best >= UNLOCK_INTERVAL_DAYS) learned.add(word.thai)
  }

  return learned
}

export interface PhraseGate {
  unlocked: boolean
  /** Component words not yet recalled correctly — what is holding it back. */
  blockedBy: string[]
}

export function gateFor(
  phrase: WordRecord,
  vocabulary: WordRecord[],
  learned: Set<string>,
): PhraseGate {
  const components = componentsOf(phrase, vocabulary)

  // A phrase with no known words inside it has nothing to gate on. Locking it
  // forever would be the wrong reading: a phrase typed in by hand, whose parts
  // were never added as separate words, should still be practisable.
  if (components.length === 0) return { unlocked: true, blockedBy: [] }

  const blockedBy = components.filter((thai) => !learned.has(thai))

  // blockedBy is still every word you do not have, even once the phrase is
  // open — it is what the card shows you to pre-empt the one word you are
  // about to not recognise, so it must not be trimmed to the allowance.
  return { unlocked: blockedBy.length <= UNLOCK_ALLOWANCE, blockedBy }
}

export interface LockedPhrase {
  phrase: WordRecord
  blockedBy: string[]
}

/** Splits the phrases in a deck into what is practisable now and what waits. */
export function partitionPhrases(
  vocabulary: WordRecord[],
  progress: Map<string, SrsState>,
): { ready: WordRecord[]; locked: LockedPhrase[] } {
  const learned = learnedWords(vocabulary, progress)
  const ready: WordRecord[] = []
  const locked: LockedPhrase[] = []

  for (const phrase of vocabulary) {
    if (phrase.kind !== 'phrase') continue
    const gate = gateFor(phrase, vocabulary, learned)
    if (gate.unlocked) ready.push(phrase)
    else locked.push({ phrase, blockedBy: gate.blockedBy })
  }

  return { ready, locked }
}
