import { describe, expect, it } from 'vitest'

import { type Lexicon, segmentNote, segmentThai } from './segment'

/**
 * The rule under test: tile the whole run or return null. A gloss that is
 * confidently wrong is worse than no gloss, because the reader has no way to
 * tell — which is exactly what substring matching produces in Thai.
 */

function lexicon(entries: Record<string, string>): Lexicon {
  return new Map(
    Object.entries(entries).map(([thai, english]) => [thai, { ipa: 'x', english }]),
  )
}

const DECK = lexicon({
  กิน: 'to eat',
  ข้าว: 'rice',
  หมา: 'dog',
  มา: 'to come',
  ขา: 'leg',
  ต้อง: 'must',
  ผ่าตัด: 'to have surgery',
  ตอน: 'period',
  เย็น: 'evening',
  ตอนเย็น: 'in the evening',
})

function words(segments: ReturnType<typeof segmentThai>): string[] {
  return (segments ?? []).filter((s) => s.gloss).map((s) => s.text)
}

describe('segmentThai', () => {
  it('splits a sentence made entirely of known words', () => {
    expect(words(segmentThai('กินข้าว', DECK))).toEqual(['กิน', 'ข้าว'])
  })

  /**
   * The case this whole approach exists for. เขา is "he" and is not in the
   * deck; a substring search finds ขา inside it and reports "leg".
   */
  it('refuses a sentence containing a word it does not know', () => {
    expect(segmentThai('เขาต้องผ่าตัด', DECK)).toBeNull()
  })

  it('does not find a short word hiding inside a longer one', () => {
    // หมา is "dog" and contains มา, "to come". Tiling หมา as one word is the
    // only complete account of it, so มา never surfaces.
    expect(words(segmentThai('หมากินข้าว', DECK))).toEqual(['หมา', 'กิน', 'ข้าว'])
  })

  it('prefers the longest reading when both are possible', () => {
    // ตอนเย็น tiles as one word or as ตอน + เย็น. Thai convention is the
    // longest match, and it is the one that is actually right here.
    expect(words(segmentThai('ตอนเย็น', DECK))).toEqual(['ตอนเย็น'])
  })

  it('keeps punctuation and spaces, without glossing them', () => {
    const segments = segmentThai('กิน ข้าว!', DECK)
    expect(segments?.map((s) => s.text).join('')).toBe('กิน ข้าว!')
    expect(words(segments)).toEqual(['กิน', 'ข้าว'])
  })

  it('carries the gloss through so the panel needs no second lookup', () => {
    const segments = segmentThai('กิน', DECK)
    expect(segments?.[0].gloss?.english).toBe('to eat')
  })

  it('handles Thai either side of non-Thai', () => {
    const segments = segmentThai('กิน 3 ข้าว', DECK)
    expect(segments?.map((s) => s.text).join('')).toBe('กิน 3 ข้าว')
    expect(words(segments)).toEqual(['กิน', 'ข้าว'])
  })

  it('fails the whole sentence when one run is unaccounted for', () => {
    // Everything before the unknown word tiles; the answer is still null,
    // because a half-tappable sentence invites the wrong conclusion.
    expect(segmentThai('กินข้าวเดี๋ยวนี้', DECK)).toBeNull()
  })

  it('returns null for empty text rather than an empty tiling', () => {
    expect(segmentThai('', DECK)).toBeNull()
  })

  it('returns null when the lexicon is empty', () => {
    expect(segmentThai('กินข้าว', new Map())).toBeNull()
  })

  it('leaves text with no Thai in it alone', () => {
    const segments = segmentThai('hello', DECK)
    expect(segments?.map((s) => s.text).join('')).toBe('hello')
    expect(words(segments)).toEqual([])
  })
})

describe('segmentNote', () => {
  const note = 'Softer than หมา /mǎː/, which is blunt.'

  it('finds a word named in a note', () => {
    expect(words(segmentNote(note, DECK))).toEqual(['หมา'])
  })

  it('leaves the reading the note already gives in place', () => {
    expect(segmentNote(note, DECK)?.map((s) => s.text).join('')).toBe(note)
  })

  /**
   * A note names whole words. Tiling here would break a word it does not know
   * into pieces it does, which is the same false-gloss problem.
   */
  it('does not tile an unknown word into known fragments', () => {
    expect(segmentNote('Careful with เขา /kʰǎw/.', DECK)).toBeNull()
  })

  it('returns null for a note with no Thai at all', () => {
    expect(segmentNote('Just English here.', DECK)).toBeNull()
  })

  it('returns null when nothing in the note can be explained', () => {
    expect(segmentNote('See เดี๋ยว /dǐaw/.', DECK)).toBeNull()
  })
})
