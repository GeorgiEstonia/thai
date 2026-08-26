import { describe, expect, it } from 'vitest'

import { BATCHES, CHARACTERS, CHARACTERS_BY_ID, charactersInBatch } from './characters'

/** The Thai consonants in dictionary order, as a ground truth to check against. */
const ALPHABET = [
  'ก', 'ข', 'ฃ', 'ค', 'ฅ', 'ฆ', 'ง', 'จ', 'ฉ', 'ช', 'ซ',
  'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ',
  'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม',
  'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ',
]

/** Thai permits only these eight sounds in syllable-final position. */
const LEGAL_FINALS = ['k', 'ng', 't', 'n', 'p', 'm', 'y', 'w']

describe('character inventory', () => {
  it('covers the alphabet exactly once, with nothing extra', () => {
    const glyphs = CHARACTERS.map((c) => c.glyph)
    expect(new Set(glyphs).size).toBe(glyphs.length)
    expect([...glyphs].sort()).toEqual([...ALPHABET].sort())
  })

  it('has the canonical class split of 9 mid, 11 high, 24 low', () => {
    const counts = { mid: 0, high: 0, low: 0 }
    for (const c of CHARACTERS) counts[c.consonantClass]++
    expect(counts).toEqual({ mid: 9, high: 11, low: 24 })
  })

  it('uses unique ids', () => {
    const ids = CHARACTERS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('fills in every field a drill card needs', () => {
    for (const c of CHARACTERS) {
      expect(c.initialSound, c.glyph).not.toBe('')
      expect(c.nameThai, c.glyph).not.toBe('')
      expect(c.namePaiboon, c.glyph).not.toBe('')
      expect(c.nameMeaning, c.glyph).not.toBe('')
      // A mnemonic short enough to be a stub is worse than none — it looks
      // authored but carries no shape hook.
      expect(c.mnemonic.length, c.glyph).toBeGreaterThan(40)
    }
  })

  it('only claims final sounds Thai actually allows', () => {
    for (const c of CHARACTERS) {
      if (c.finalSound !== null) {
        expect(LEGAL_FINALS, `${c.glyph} final`).toContain(c.finalSound)
      }
    }
  })
})

describe('confusable sets', () => {
  it('points only at characters that exist', () => {
    for (const c of CHARACTERS) {
      for (const id of c.confusableWith) {
        expect(CHARACTERS_BY_ID.has(id), `${c.glyph} -> ${id}`).toBe(true)
      }
    }
  })

  it('never lists a character as confusable with itself', () => {
    for (const c of CHARACTERS) {
      expect(c.confusableWith, c.glyph).not.toContain(c.id)
    }
  })

  it('is symmetric — the contrast drill depends on it', () => {
    const asymmetric: string[] = []
    for (const c of CHARACTERS) {
      for (const id of c.confusableWith) {
        const other = CHARACTERS_BY_ID.get(id)
        if (other && !other.confusableWith.includes(c.id)) {
          asymmetric.push(`${c.glyph} lists ${other.glyph}, but not the reverse`)
        }
      }
    }
    expect(asymmetric).toEqual([])
  })
})

describe('batches', () => {
  it('assigns every character to a known batch', () => {
    for (const c of CHARACTERS) {
      expect(BATCHES, c.glyph).toContain(c.batch)
    }
  })

  it('keeps early batches small enough for one sitting', () => {
    for (const batch of [1, 2, 3, 4] as const) {
      const size = charactersInBatch(batch).length
      expect(size, `batch ${batch}`).toBeGreaterThan(0)
      expect(size, `batch ${batch}`).toBeLessThanOrEqual(8)
    }
  })

  it('teaches batch 1 as pure mid class', () => {
    for (const c of charactersInBatch(1)) {
      expect(c.consonantClass, c.glyph).toBe('mid')
    }
  })

  it('teaches batch 2 as pure high class', () => {
    for (const c of charactersInBatch(2)) {
      expect(c.consonantClass, c.glyph).toBe('high')
    }
  })

  it('pairs every batch-3 letter with a batch-2 letter of the same sound', () => {
    const highSounds = new Set(charactersInBatch(2).map((c) => c.initialSound))
    for (const c of charactersInBatch(3)) {
      expect(c.consonantClass, c.glyph).toBe('low')
      expect(highSounds, `${c.glyph} should twin a batch-2 sound`).toContain(c.initialSound)
    }
  })

  it('defers the obsolete letters out of the drilled batches', () => {
    for (const c of CHARACTERS) {
      if (c.frequency === 'obsolete') expect(c.batch, c.glyph).toBe(5)
    }
  })
})
