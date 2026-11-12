import { DIRECTIONS, type WordRecord, cardKey } from '@/content/items'

import { buildLexicon } from './lexicon'
import { type Lexicon, segmentThai } from './segment'
import type { SrsState } from './srs'

/**
 * When a sentence is worth showing you.
 *
 * A sentence you can't read at all is not a hard card — it is several
 * unlearned words wearing a trench coat. You miss it, the whole thing resets,
 * and you learn nothing about which part you didn't know. So some gate is
 * needed. The question this file answers is how tight it should be, and the
 * answer has changed twice.
 *
 * It began as "every word in it must be known", which is i+0: with eighty
 * words recalled it locked 174 of 176 sentences. Then "all but one", which is
 * i+1 and still locked 177 of 207.
 *
 * Both were reading the research as if these were plain texts being read
 * unaided. The oft-quoted thresholds — 98% of running words known for
 * comfortable reading, 95% as the floor (Hu & Nation 2000) — are about
 * unassisted comprehension of continuous prose. A single studied sentence on
 * a flashcard is a different object: it comes with its own translation, its
 * own romanisation, and since the tap-to-look-up work, a gloss for every word
 * in it on demand. That is squarely the *assisted* condition, where coverage
 * requirements drop sharply, and where glossing is reliably found to help
 * incidental vocabulary learning in proportion to how often the gloss is
 * actually consulted.
 *
 * And meeting a word inside a sentence is not a cost to be minimised. Words
 * met across several different contexts are learned and retained better than
 * words drilled repeatedly in one (contextual diversity; Rosa, Tapia & Perea
 * 2017), and generalise better to new contexts. A sentence carrying one or
 * two words you have not formally studied is the mechanism by which that
 * happens, not a flaw in the gate.
 *
 * So the gate is now about coverage, with two limits that come from the two
 * ways this can go wrong:
 *
 *  - a *ratio* floor, because what makes a sentence readable is the
 *    proportion you know, not an absolute count: two unknown words in a
 *    three-word sentence is a vocabulary test, two in nine is reading;
 *  - an *absolute* cap, because the ratio alone would let a long sentence
 *    arrive with five new words at once, and a desirable difficulty stops
 *    being desirable when success is out of reach (Bjork).
 *
 * And the loose limits apply only when the sentence can actually be split
 * into words and looked up. If it can't, the gloss is not available, the
 * assisted condition does not hold, and the old strict rule is correct.
 */

/** One correct recall. Deliberately low: the gate is "met it", not "owns it". */
export const UNLOCK_INTERVAL_DAYS = 1

/**
 * Unknown words allowed in a sentence you cannot look words up in.
 *
 * One. With no gloss available there is nothing to tell you which part of the
 * sentence you are missing, so the unknown word has to be inferable from the
 * rest — which is only true when there is at most one of them.
 */
export const UNLOCK_ALLOWANCE = 1

/**
 * Unknown words allowed in a sentence you can tap to look up.
 *
 * Three. Not because three is a magic number, but because the cost of a
 * fourth is that the sentence stops being a sentence you are reading with
 * help and becomes four vocabulary cards presented at once — and because
 * what arrives in a sitting has to stay inside what one sitting can absorb.
 */
export const UNLOCK_ALLOWANCE_GLOSSED = 3

/**
 * The least of a sentence you may know and still be shown it.
 *
 * Half. Far below the 95% of the reading-comprehension literature, and
 * deliberately so: those figures are for reading prose unaided, and this is a
 * sentence with a translation under it and a gloss behind every word. What
 * this floor is actually for is stopping the *short* sentences — where two
 * unknown words out of three means there is no context left to carry them.
 */
export const MIN_COVERAGE = 0.5

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
  /** Share of the sentence's words already recalled once, 0 to 1. */
  coverage: number
  /** Whether every word in it can be looked up, so a gloss is available. */
  glossed: boolean
}

/**
 * Whether a sentence will show its words' meanings on tap.
 *
 * The same check the card itself makes, so the gate can never be looser than
 * the help it is assuming you have.
 */
export function isGlossable(phrase: WordRecord, lexicon: Lexicon): boolean {
  return segmentThai(phrase.thai, lexicon) !== null
}

/**
 * The sentence as words, and which of them you have not studied.
 *
 * Measured off the segmentation rather than off substring matches against the
 * deck, for two reasons.
 *
 * The first is accuracy: searching a phrase for deck words is the approach
 * that finds ขา "leg" inside เขา "he", and the tiling exists precisely
 * because it does not.
 *
 * The second is the denominator, which turned out to matter more. Counting
 * only the deck words it could find, the median shipped sentence looked three
 * words long — so one unknown word already put it under half known, and a
 * ratio floor could never do anything. The real sentence is six or seven
 * words. Its particles, pronouns and politeness words are in the shipped
 * glossary rather than the deck because they were never worth a card, and a
 * word you were never asked to study should not be counted against you. It is
 * context, which is the whole point: it is what carries the new word.
 */
function wordsOf(
  phrase: WordRecord,
  vocabulary: WordRecord[],
  learned: Set<string>,
  lexicon: Lexicon,
): { total: number; unknown: string[] } | null {
  const segments = segmentThai(phrase.thai, lexicon)
  if (!segments) return null

  const studied = new Set<string>()
  for (const word of vocabulary) {
    if (word.kind === 'word') studied.add(word.thai.trim())
  }

  const unknown = new Set<string>()
  let total = 0

  for (const segment of segments) {
    if (!segment.gloss) continue
    total++
    if (studied.has(segment.text) && !learned.has(segment.text)) unknown.add(segment.text)
  }

  return { total, unknown: [...unknown] }
}

export function gateFor(
  phrase: WordRecord,
  vocabulary: WordRecord[],
  learned: Set<string>,
  lexicon: Lexicon,
): PhraseGate {
  const split = wordsOf(phrase, vocabulary, learned, lexicon)
  const glossed = split !== null

  // Without a split there is no gloss and no reliable word count, so fall
  // back to looking for deck words inside the phrase — less accurate, but it
  // is all there is, and the strict allowance below accounts for that.
  const components = split ? null : componentsOf(phrase, vocabulary)

  // A phrase with nothing recognisable in it has nothing to gate on. Locking
  // it forever would be the wrong reading: a phrase typed in by hand, whose
  // parts were never added as separate words, should still be practisable.
  if ((split?.total ?? components?.length ?? 0) === 0) {
    return { unlocked: true, blockedBy: [], coverage: 1, glossed }
  }

  // blockedBy is every word you do not have, even once the phrase is open —
  // it is what the card points out to pre-empt the words you are about to not
  // recognise, so it must not be trimmed to the allowance.
  const blockedBy = split ? split.unknown : components!.filter((thai) => !learned.has(thai))
  const total = split ? split.total : components!.length
  const coverage = (total - blockedBy.length) / total

  const allowance = glossed ? UNLOCK_ALLOWANCE_GLOSSED : UNLOCK_ALLOWANCE

  // One unknown word is always allowed through regardless of how short the
  // sentence is, which is the i+1 the file has always claimed to implement.
  // Beyond that the ratio has to hold as well as the count.
  const unlocked =
    blockedBy.length <= UNLOCK_ALLOWANCE ||
    (blockedBy.length <= allowance && coverage >= MIN_COVERAGE)

  return { unlocked, blockedBy, coverage, glossed }
}

export interface LockedPhrase {
  phrase: WordRecord
  blockedBy: string[]
}

/** Splits the phrases in a deck into what is practisable now and what waits. */
export function partitionPhrases(
  vocabulary: WordRecord[],
  progress: Map<string, SrsState>,
  lexicon: Lexicon = buildLexicon(vocabulary),
): { ready: WordRecord[]; locked: LockedPhrase[] } {
  const learned = learnedWords(vocabulary, progress)
  const ready: WordRecord[] = []
  const locked: LockedPhrase[] = []

  for (const phrase of vocabulary) {
    if (phrase.kind !== 'phrase') continue
    const gate = gateFor(phrase, vocabulary, learned, lexicon)
    if (gate.unlocked) ready.push(phrase)
    else locked.push({ phrase, blockedBy: gate.blockedBy })
  }

  return { ready, locked }
}
