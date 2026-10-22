import { describe, expect, it } from 'vitest'

import { describeKey } from './describe-match'

/**
 * The bug: the describe prompt tells the model to romanise every Thai word it
 * writes, and it applied that to the echoed identifier too. Matching on the
 * raw string found nothing, so a whole batch could report success while saving
 * nothing at all.
 */
describe('describeKey', () => {
  it('matches an echo that came back with its reading appended', () => {
    expect(describeKey('หมา (mǎː)')).toBe('หมา')
  })

  it('leaves a plain headword untouched', () => {
    expect(describeKey('หมา')).toBe('หมา')
  })

  it('lines the two forms up, which is the whole point', () => {
    expect(describeKey('บ้าน (bâːn)')).toBe(describeKey('บ้าน'))
  })

  it('copes with a multi-word phrase carrying a reading', () => {
    expect(describeKey('กินข้าว (gin kʰâːw)')).toBe('กินข้าว')
  })

  it('only strips a reading at the end, not brackets mid-string', () => {
    expect(describeKey('ก (ไก่) ข')).toBe('ก (ไก่) ข')
  })

  it('trims stray whitespace so a padded echo still matches', () => {
    expect(describeKey('  ไป  ')).toBe('ไป')
  })
})
