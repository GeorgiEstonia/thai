import { describe, expect, it } from 'vitest'

import { type WordRecord, cardKey } from '@/content/items'

import type { SrsState } from './srs'
import { componentsOf, gateFor, learnedWords, partitionPhrases } from './unlock'

/**
 * The rule under test: a phrase is offered once it is at most one unknown word
 * past what you have — i+1. A sentence should never be the place you meet five
 * words for the first time, but demanding you already know all of them is a
 * different rule that starves: it left 174 of 176 sentences locked.
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
    expect(gateFor(EAT_RICE, DECK, learned)).toEqual({ unlocked: true, blockedBy: ['ข้าว'] })
  })

  /**
   * Still reported as blocking even though the phrase is open: the card shows
   * it to pre-empt the one word you are about to not recognise.
   */
  it('still names the word you do not have, so the card can show it', () => {
    const learned = learnedWords(DECK, progressFor(['w1']))
    expect(gateFor(EAT_RICE, DECK, learned).blockedBy).toEqual(['ข้าว'])
  })

  it('locks a phrase that is two or more unknown words away', () => {
    const learned = learnedWords(BIG_DECK, progressFor(['w1']))
    const gate = gateFor(DOG_EATS_RICE, BIG_DECK, learned)
    expect(gate.unlocked).toBe(false)
    expect(gate.blockedBy.sort()).toEqual(['หมา', 'ข้าว'].sort())
  })

  it('opens that phrase as soon as it is down to one unknown word', () => {
    const learned = learnedWords(BIG_DECK, progressFor(['w1', 'w2']))
    expect(gateFor(DOG_EATS_RICE, BIG_DECK, learned).unlocked).toBe(true)
  })

  it('locks a phrase when none of its words is known', () => {
    const learned = learnedWords(BIG_DECK, progressFor([]))
    expect(gateFor(DOG_EATS_RICE, BIG_DECK, learned).unlocked).toBe(false)
  })

  it('unlocks once every word has been had right once', () => {
    const learned = learnedWords(DECK, progressFor(['w1', 'w2']))
    expect(gateFor(EAT_RICE, DECK, learned)).toEqual({ unlocked: true, blockedBy: [] })
  })

  it('does not lock a phrase whose parts were never added as words', () => {
    // Otherwise a hand-typed phrase would be unpractisable forever.
    const orphan = phrase('p3', 'สวัสดีครับ', 'hello')
    expect(gateFor(orphan, [orphan], new Set()).unlocked).toBe(true)
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
