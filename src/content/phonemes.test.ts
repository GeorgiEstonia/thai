import { describe, expect, it } from 'vitest'

import { CHARACTERS } from './characters'
import { PRACTICE_ITEMS, SELECTABLE_GROUPS, produceHint, soundIsShared } from './items'
import { PHONEME_BY_CHAR, PHONEME_GROUPS } from './phonemes'
import { VOWELS, VOWEL_GROUPS } from './vowels'

const LEGAL_FINALS = ['k', 'ŋ', 't', 'n', 'p', 'm', 'j', 'w']

describe('phoneme coverage', () => {
  it('gives every character an IPA value', () => {
    for (const character of CHARACTERS) {
      expect(PHONEME_BY_CHAR[character.id], character.glyph).toBeDefined()
    }
  })

  it('has no IPA entries for characters that do not exist', () => {
    const ids = new Set(CHARACTERS.map((c) => c.id))
    for (const id of Object.keys(PHONEME_BY_CHAR)) {
      expect(ids.has(id), id).toBe(true)
    }
  })

  it('only claims final sounds Thai allows', () => {
    for (const [id, phoneme] of Object.entries(PHONEME_BY_CHAR)) {
      if (phoneme.ipaFinal !== null) {
        expect(LEGAL_FINALS, `${id} final`).toContain(phoneme.ipaFinal)
      }
    }
  })

  it('places every character in exactly one group', () => {
    const seen = new Map<string, string>()
    for (const group of PHONEME_GROUPS) {
      for (const member of group.members) {
        expect(seen.has(member), `${member} in two groups`).toBe(false)
        seen.set(member, group.id)
      }
    }
    expect(seen.size).toBe(CHARACTERS.length)
  })

  it('groups characters that genuinely share a sound', () => {
    for (const group of PHONEME_GROUPS) {
      for (const member of group.members) {
        expect(PHONEME_BY_CHAR[member].ipa, `${member} in /${group.id}/`).toBe(group.id)
      }
    }
  })
})

describe('vowels', () => {
  it('places every vowel in exactly one group', () => {
    const grouped = VOWEL_GROUPS.flatMap((group) => group.members)
    expect(new Set(grouped).size).toBe(grouped.length)
    expect([...grouped].sort()).toEqual(VOWELS.map((v) => v.id).sort())
  })

  it('marks the consonant slot in every written pattern', () => {
    for (const vowel of VOWELS) {
      expect(vowel.pattern, vowel.id).toContain('◌')
    }
  })

  it('pairs short and long forms within a quality group', () => {
    for (const group of VOWEL_GROUPS) {
      if (group.members.length !== 2) continue
      const lengths = group.members.map((id) => VOWELS.find((v) => v.id === id)!.length)
      expect(new Set(lengths).size, `${group.id} should be one short, one long`).toBe(2)
    }
  })
})

describe('practice items', () => {
  it('covers every character and vowel', () => {
    expect(PRACTICE_ITEMS).toHaveLength(CHARACTERS.length + VOWELS.length)
  })

  it('exposes every group on the selection screen', () => {
    const selectable = new Set(SELECTABLE_GROUPS.map((group) => group.id))
    for (const item of PRACTICE_ITEMS) {
      expect(selectable.has(item.group), `${item.thai} group ${item.group}`).toBe(true)
    }
  })

  it('gives a disambiguator whenever a sound has more than one written form', () => {
    // Six letters are /tʰ/. An "IPA -> Thai" prompt showing only /tʰ/ has six
    // right answers, so it must carry something that narrows it to one.
    for (const item of PRACTICE_ITEMS) {
      if (soundIsShared(item)) {
        expect(produceHint(item), `${item.thai} needs a hint`).toBeTruthy()
      } else {
        expect(produceHint(item), `${item.thai} needs no hint`).toBeNull()
      }
    }
  })

  it('finds the six letters that share /tʰ/', () => {
    const th = PRACTICE_ITEMS.filter((item) => item.type === 'character' && item.ipa === 'tʰ')
    expect(th).toHaveLength(6)
  })
})
