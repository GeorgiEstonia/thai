import { describe, expect, it } from 'vitest'

import { bareThaiRuns, isFullyRomanised } from './romanised'

/**
 * The exact failure this exists to catch: a note reading "after เที่ยง (noon)".
 * The bracket is there, so the instruction looks obeyed — but the reader still
 * cannot say the word, which was the whole point of asking.
 */
describe('bareThaiRuns', () => {
  it('accepts a word followed by its reading', () => {
    expect(isFullyRomanised('More formal than สุนัข /sù.nák/.')).toBe(true)
  })

  it('rejects a word followed only by its English meaning', () => {
    expect(bareThaiRuns('after เที่ยง (noon) and before dark')).toEqual(['เที่ยง'])
  })

  it('rejects a word with nothing after it at all', () => {
    expect(bareThaiRuns('1 p.m. is บ่ายโมง, with no number.')).toContain('บ่ายโมง')
  })

  it('catches every bare mention, not just the first', () => {
    const bare = bareThaiRuns('บ่ายโมง has no number before โมง at all')
    expect(bare.length).toBe(2)
  })

  it('accepts a reading followed by a gloss as well', () => {
    expect(isFullyRomanised('after เที่ยง /thîaŋ/ (noon)')).toBe(true)
  })

  it('passes text with no Thai in it', () => {
    expect(isFullyRomanised('Everyday word, nothing unusual about it.')).toBe(true)
  })

  it('passes nothing at all', () => {
    expect(isFullyRomanised(null)).toBe(true)
    expect(isFullyRomanised('')).toBe(true)
  })

  it('accepts a reading written with IPA symbols rather than plain letters', () => {
    expect(isFullyRomanised('counted with ตัว /tuːa/')).toBe(true)
  })

  it('rejects empty slashes, which tell the reader nothing', () => {
    expect(bareThaiRuns('counted with ตัว //')).toEqual(['ตัว'])
  })

  it('handles several words where only one is missing its reading', () => {
    const bare = bareThaiRuns('ครับ /kʰráp/ for men and ค่ะ for women')
    expect(bare).toEqual(['ค่ะ'])
  })
})
