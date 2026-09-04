import { describe, expect, it } from 'vitest'

import { CHARACTERS } from '@/content/characters'
import { VOWELS } from '@/content/vowels'
import { PRACTICE_ITEMS, wordItem } from '@/content/items'

import { speechTextFor } from './speech'

/**
 * What gets spoken is not always what is printed on the card, and the cases
 * where it differs are the ones worth pinning down.
 */
describe('speechTextFor', () => {
  it('speaks a word as it is written', () => {
    const item = wordItem({
      id: 'w1',
      thai: 'บ้าน',
      ipa: 'bâːn',
      english: 'house',
      kind: 'word',
      pack: null,
      notes: null,
    })
    expect(speechTextFor(item)).toBe('บ้าน')
  })

  it('speaks a consonant by its acrophonic name, the way it is spelled aloud', () => {
    const kokai = PRACTICE_ITEMS.find(
      (item) => item.type === 'character' && item.character.id === 'ko-kai',
    )!
    // ก on its own is a letter, not a syllable. "กอ ไก่" is what a Thai says.
    expect(speechTextFor(kokai)).toBe('กอ ไก่')
  })

  it('never tries to pronounce a vowel pattern, which is not a syllable', () => {
    for (const item of PRACTICE_ITEMS.filter((entry) => entry.type === 'vowel')) {
      const spoken = speechTextFor(item)
      // ◌ is a placeholder for the consonant; speaking it is meaningless.
      expect(spoken).not.toContain('◌')
      expect(spoken.length).toBeGreaterThan(0)
    }
  })

  it('speaks a vowel through its example word', () => {
    const vowel = PRACTICE_ITEMS.find((item) => item.type === 'vowel')!
    expect(speechTextFor(vowel)).toBe(
      VOWELS.find((entry) => entry.id === vowel.id)!.exampleThai,
    )
  })

  it('has something sayable for every authored item', () => {
    expect(CHARACTERS.length + VOWELS.length).toBeGreaterThan(0)
    for (const item of PRACTICE_ITEMS) {
      expect(speechTextFor(item).trim()).not.toBe('')
    }
  })
})
