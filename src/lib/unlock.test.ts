import { describe, expect, it } from 'vitest'

import { type WordRecord, cardKey } from '@/content/items'

import type { Lexicon } from './segment'
import type { SrsState } from './srs'
import {
  MIN_COVERAGE,
  UNLOCK_ALLOWANCE_GLOSSED,
  componentsOf,
  gateFor,
  learnedWords,
  partitionPhrases,
} from './unlock'

/**
 * The rule under test: a sentence is offered on *coverage*, not on a count of
 * unknown words — most of it known, at most a few words new, and the loose
 * limits only where every word in it can be looked up on tap.
 *
 * Two earlier rules are what this replaced. "Every word known" is i+0 and
 * left 174 of 176 sentences locked. "All but one" is i+1 and still left 177
 * of 207 locked, because it read a glossed flashcard as though it were a page
 * of unassisted prose. Meeting a word inside a sentence that means something
 * is how words are learned, not a cost to be driven to zero.
 */

const NOW = new Date('2026-09-03T00:00:00.000Z')

function word(id: string, thai: string, english: string): WordRecord {
  return { id, thai, ipa: '', english, kind: 'word', pack: null, notes: null }
}

function phrase(id: string, thai: string, english: string): WordRecord {
  return { id, thai, ipa: '', english, kind: 'phrase', pack: null, notes: null }
}

function scheduled(intervalDays: number): SrsState {
  return { intervalDays, dueAt: NOW, reps: 1, lapses: 0 }
}

/** A lexicon in which exactly these words can be looked up. */
function lexiconOf(...words: WordRecord[]): Lexicon {
  return new Map(words.map((w) => [w.thai, { ipa: w.ipa, english: w.english }]))
}

/** Progress with the named word ids recalled correctly at least once. */
function progressFor(ids: string[]): Map<string, SrsState> {
  return new Map(ids.map((id) => [cardKey('word', id, 'recognise'), scheduled(1)]))
}

const KIN = word('w1', 'กิน', 'to eat')
const KHAAW = word('w2', 'ข้าว', 'rice')
const MAA = word('w3', 'หมา', 'dog')
const EAT_RICE = phrase('p1', 'กินข้าว', 'to eat rice')
/** Three components, so it can be two or more words short. */
const DOG_EATS_RICE = phrase('p2', 'หมากินข้าว', 'the dog eats rice')

const DECK = [KIN, KHAAW, MAA, EAT_RICE]
const BIG_DECK = [KIN, KHAAW, MAA, DOG_EATS_RICE]

/** Every word in these decks is tappable, so the glossed limits apply. */
const LEXICON = lexiconOf(KIN, KHAAW, MAA)

// Six components, so coverage and the absolute cap can pull in different
// directions. Not idiomatic Thai; it is a shape, not a sentence.
const NAAM = word('w6', 'น้ำ', 'water')
const PAI = word('w7', 'ไป', 'to go')
const DII = word('w8', 'ดี', 'good')
const LONG = phrase('p6', 'หมากินข้าวไปน้ำดี', 'six words')
const LONG_DECK = [KIN, KHAAW, MAA, NAAM, PAI, DII, LONG]
const LONG_LEXICON = lexiconOf(KIN, KHAAW, MAA, NAAM, PAI, DII)

describe('componentsOf', () => {
  it('finds the words a phrase is built from', () => {
    expect(componentsOf(EAT_RICE, DECK).sort()).toEqual(['กิน', 'ข้าว'])
  })

  it('does not count a word that is not in the phrase', () => {
    expect(componentsOf(EAT_RICE, DECK)).not.toContain('หมา')
  })

  it('never counts the phrase as its own component', () => {
    const identical = phrase('p2', 'กิน', 'eating')
    expect(componentsOf(identical, [KIN, identical])).toEqual([])
  })

  it('lists a word once even when the deck holds it twice', () => {
    // The same word imported from two worksheets is two rows, one word.
    const duplicate = word('w4', 'กิน', 'to eat')
    expect(componentsOf(EAT_RICE, [...DECK, duplicate])).toEqual(['กิน', 'ข้าว'])
  })

  it('prefers the longest reading when one word sits inside another', () => {
    // มา ("come") is a substring of หมา ("dog"). A phrase about a dog is not
    // waiting on the word "come".
    const maa = word('w5', 'มา', 'to come')
    const dogDrinks = phrase('p4', 'หมากินน้ำ', 'the dog drinks water')
    const deck = [MAA, maa, KIN, dogDrinks]

    expect(componentsOf(dogDrinks, deck)).toContain('หมา')
    expect(componentsOf(dogDrinks, deck)).not.toContain('มา')
  })

  it('ignores single characters, which match by coincidence', () => {
    const letter = word('w9', 'ก', 'letter')
    expect(componentsOf(EAT_RICE, [letter, EAT_RICE])).toEqual([])
  })
})

describe('learnedWords', () => {
  it('counts a word recalled correctly in either direction', () => {
    const produceOnly = new Map([[cardKey('word', 'w1', 'produce'), scheduled(1)]])
    expect(learnedWords(DECK, produceOnly)).toEqual(new Set(['กิน']))
  })

  it('does not count a word that has only ever been missed', () => {
    const missed = new Map([[cardKey('word', 'w1', 'recognise'), scheduled(0)]])
    expect(learnedWords(DECK, missed).size).toBe(0)
  })

  it('does not count a word never seen at all', () => {
    expect(learnedWords(DECK, new Map()).size).toBe(0)
  })
})

describe('gateFor', () => {
  it('opens a phrase that is one unknown word away', () => {
    const learned = learnedWords(DECK, progressFor(['w1']))
    const gate = gateFor(EAT_RICE, DECK, learned, LEXICON)
    expect(gate.unlocked).toBe(true)
    expect(gate.blockedBy).toEqual(['ข้าว'])
  })

  /**
   * Still reported as blocking even though the phrase is open: the card marks
   * it in the sentence and names it, so a word you have never studied is met
   * rather than skated over.
   */
  it('still names the words you do not have, so the card can show them', () => {
    const learned = learnedWords(LONG_DECK, progressFor(['w1', 'w2', 'w3', 'w6']))
    const gate = gateFor(LONG, LONG_DECK, learned, LONG_LEXICON)
    expect(gate.unlocked).toBe(true)
    expect(gate.blockedBy.sort()).toEqual(['ไป', 'ดี'].sort())
  })

  it('unlocks once every word has been had right once', () => {
    const learned = learnedWords(DECK, progressFor(['w1', 'w2']))
    const gate = gateFor(EAT_RICE, DECK, learned, LEXICON)
    expect(gate.unlocked).toBe(true)
    expect(gate.blockedBy).toEqual([])
    expect(gate.coverage).toBe(1)
  })

  it('does not lock a phrase whose parts were never added as words', () => {
    // Otherwise a hand-typed phrase would be unpractisable forever.
    const orphan = phrase('p3', 'สวัสดีครับ', 'hello')
    expect(gateFor(orphan, [orphan], new Set(), LEXICON).unlocked).toBe(true)
  })

  it('reports how much of the sentence is known', () => {
    const learned = learnedWords(LONG_DECK, progressFor(['w1', 'w2', 'w3']))
    expect(gateFor(LONG, LONG_DECK, learned, LONG_LEXICON).coverage).toBeCloseTo(0.5)
  })

  describe('a sentence you can tap for word meanings', () => {
    it('opens with several new words when most of it is known', () => {
      // Four of six known: coverage above the floor, two new words.
      const learned = learnedWords(LONG_DECK, progressFor(['w1', 'w2', 'w3', 'w6']))
      const gate = gateFor(LONG, LONG_DECK, learned, LONG_LEXICON)
      expect(gate.glossed).toBe(true)
      expect(gate.unlocked).toBe(true)
      expect(gate.blockedBy).toHaveLength(2)
    })

    it('opens at exactly the coverage floor', () => {
      const learned = learnedWords(LONG_DECK, progressFor(['w1', 'w2', 'w3']))
      const gate = gateFor(LONG, LONG_DECK, learned, LONG_LEXICON)
      expect(gate.coverage).toBe(MIN_COVERAGE)
      expect(gate.unlocked).toBe(true)
      expect(gate.blockedBy).toHaveLength(UNLOCK_ALLOWANCE_GLOSSED)
    })

    it('stays shut below the coverage floor', () => {
      // Two of six: a sentence with nothing left to carry the new words.
      const learned = learnedWords(LONG_DECK, progressFor(['w1', 'w2']))
      const gate = gateFor(LONG, LONG_DECK, learned, LONG_LEXICON)
      expect(gate.coverage).toBeLessThan(MIN_COVERAGE)
      expect(gate.unlocked).toBe(false)
    })

    it('stays shut on a short sentence that is mostly unknown', () => {
      // Three components, two unknown — a vocabulary test, not reading.
      const learned = learnedWords(BIG_DECK, progressFor(['w1']))
      const gate = gateFor(DOG_EATS_RICE, BIG_DECK, learned, LEXICON)
      expect(gate.unlocked).toBe(false)
      expect(gate.blockedBy.sort()).toEqual(['หมา', 'ข้าว'].sort())
    })

    it('opens that short sentence as soon as it is down to one unknown word', () => {
      const learned = learnedWords(BIG_DECK, progressFor(['w1', 'w2']))
      expect(gateFor(DOG_EATS_RICE, BIG_DECK, learned, LEXICON).unlocked).toBe(true)
    })

    it('never admits more new words than one sitting can take', () => {
      // Eight of twelve known would clear the ratio, but four new words at
      // once is four vocabulary cards wearing a sentence.
      // Distinct, non-overlapping forms, since a substring would collapse
      // into the longer word that contains it.
      const forms = ['กิน', 'ข้าว', 'หมา', 'น้ำ', 'ไป', 'ดี', 'รัก', 'ซื้อ', 'ใหญ่', 'เล็ก', 'ร้อน', 'เย็น']
      const words = forms.map((thai, i) => word(`x${i}`, thai, `word ${i}`))
      const long = phrase('p7', forms.join(''), 'twelve words')
      const deck = [...words, long]
      const learned = learnedWords(deck, progressFor(words.slice(0, 8).map((w) => w.id)))
      const gate = gateFor(long, deck, learned, lexiconOf(...words))

      expect(gate.coverage).toBeGreaterThan(MIN_COVERAGE)
      expect(gate.blockedBy).toHaveLength(4)
      expect(gate.unlocked).toBe(false)
    })
  })

  describe('a sentence that cannot be split into words', () => {
    // No gloss is available, so there is nothing to tell you which part you
    // are missing. Back to the strict rule, which is correct here.
    const OPAQUE = phrase('p8', 'หมากินข้าวไปน้ำดีฤ', 'unsplittable')
    const OPAQUE_DECK = [KIN, KHAAW, MAA, NAAM, PAI, DII, OPAQUE]

    it('is recognised as unglossable', () => {
      const learned = learnedWords(OPAQUE_DECK, progressFor([]))
      expect(gateFor(OPAQUE, OPAQUE_DECK, learned, LONG_LEXICON).glossed).toBe(false)
    })

    it('stays shut with two new words even at good coverage', () => {
      const learned = learnedWords(OPAQUE_DECK, progressFor(['w1', 'w2', 'w3', 'w6']))
      const gate = gateFor(OPAQUE, OPAQUE_DECK, learned, LONG_LEXICON)
      expect(gate.coverage).toBeGreaterThan(MIN_COVERAGE)
      expect(gate.unlocked).toBe(false)
    })

    it('still opens one unknown word short', () => {
      const learned = learnedWords(
        OPAQUE_DECK,
        progressFor(['w1', 'w2', 'w3', 'w6', 'w7']),
      )
      expect(gateFor(OPAQUE, OPAQUE_DECK, learned, LONG_LEXICON).unlocked).toBe(true)
    })
  })
})

describe('partitionPhrases', () => {
  it('separates what is practisable now from what is waiting', () => {
    const { ready, locked } = partitionPhrases(BIG_DECK, progressFor(['w1']))

    expect(ready).toEqual([])
    expect(locked).toHaveLength(1)
    expect(locked[0].phrase.id).toBe('p2')
    expect(locked[0].blockedBy.sort()).toEqual(['หมา', 'ข้าว'].sort())
  })

  it('offers a phrase that is one word short rather than holding it back', () => {
    const { ready, locked } = partitionPhrases(DECK, progressFor(['w1']))
    expect(ready.map((p) => p.id)).toEqual(['p1'])
    expect(locked).toEqual([])
  })

  it('moves a phrase across once its last word lands', () => {
    const { ready, locked } = partitionPhrases(DECK, progressFor(['w1', 'w2']))

    expect(ready.map((p) => p.id)).toEqual(['p1'])
    expect(locked).toEqual([])
  })

  it('never returns plain words on either side', () => {
    const { ready, locked } = partitionPhrases(DECK, progressFor(['w1', 'w2']))
    for (const item of [...ready, ...locked.map((l) => l.phrase)]) {
      expect(item.kind).toBe('phrase')
    }
  })
})
