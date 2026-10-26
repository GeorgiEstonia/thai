import { describe, expect, it } from 'vitest'

import { bareThaiRuns } from '@/lib/romanised'

import { REVISIONS } from './revisions'

/**
 * The content in revisions.ts is written by hand, which means it can be wrong
 * in exactly the ways the generated content was wrong. These apply the same
 * rules to it — the point of writing it out was to fix those faults, not to
 * exempt the new copy from them.
 */

const THAI = /[฀-๿]/

describe('hand-written revisions', () => {
  it('covers a serious part of the deck', () => {
    expect(REVISIONS.length).toBeGreaterThan(450)
  })

  it('never writes a Thai word in a note without its reading', () => {
    const offenders = REVISIONS.flatMap((entry) => {
      const bare = [...bareThaiRuns(entry.context), ...bareThaiRuns(entry.classifier)]
      return bare.length > 0 ? [`${entry.thai}: ${bare.join(', ')}`] : []
    })
    expect(offenders).toEqual([])
  })

  it('gives every entry all three parts of an example', () => {
    const incomplete = REVISIONS.filter(
      (entry) =>
        !entry.exampleThai.trim() || !entry.exampleIpa.trim() || !entry.exampleEnglish.trim(),
    ).map((entry) => entry.thai)
    expect(incomplete).toEqual([])
  })

  it('writes the example in Thai script and its reading in Latin', () => {
    const wrong = REVISIONS.filter(
      (entry) => !THAI.test(entry.exampleThai) || THAI.test(entry.exampleIpa),
    ).map((entry) => entry.thai)
    expect(wrong).toEqual([])
  })

  it('gives the English example no Thai script', () => {
    const wrong = REVISIONS.filter((entry) => THAI.test(entry.exampleEnglish)).map((e) => e.thai)
    expect(wrong).toEqual([])
  })

  /**
   * The example has to contain the word it is an example of. An example that
   * does not use the headword teaches a different word instead, and the card
   * looks right while being useless.
   */
  it('uses the word it is an example of', () => {
    const missing = REVISIONS.filter((entry) => {
      // A headword is not always one unbroken run of Thai. Some carry a
      // numeral that the example writes out in words (บ่าย 3 โมง becomes
      // บ่ายสามโมง), some a "..." standing in for a number (อีก...วัน), and
      // some a space before the repetition mark. So this asks that every Thai
      // stretch of the headword turns up, rather than the whole string at once.
      const parts = entry.thai
        .split(/[^฀-๿]+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 2)
      if (parts.length === 0) return false
      const example = entry.exampleThai.replace(/\s+/g, '')
      return !parts.every((part) => example.includes(part))
    }).map((entry) => `${entry.thai} / ${entry.exampleThai}`)
    expect(missing).toEqual([])
  })

  it('has no duplicate entries, which would fight over the same word', () => {
    const seen = new Map<string, number>()
    for (const entry of REVISIONS) {
      const key = `${entry.kind ?? 'word'}:${entry.thai}`
      seen.set(key, (seen.get(key) ?? 0) + 1)
    }
    expect([...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k)).toEqual([])
  })

  it('sets a classifier only where one is given with its reading', () => {
    const wrong = REVISIONS.filter(
      (entry) => entry.classifier && !/\/[^/]+\//.test(entry.classifier),
    ).map((entry) => `${entry.thai}: ${entry.classifier}`)
    expect(wrong).toEqual([])
  })
})
