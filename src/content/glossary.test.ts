import { describe, expect, it } from 'vitest'

import { buildLexicon } from '@/lib/practice'
import { segmentThai } from '@/lib/segment'

import { GLOSSARY } from './glossary'
import { REVISIONS } from './revisions'

/**
 * The guarantee: every sentence the app ships can be split into words, using
 * only what the app ships. If this depended on the database, deleting one card
 * would quietly stop unrelated sentences being readable.
 */
describe('shipped sentences can always be split', () => {
  // An empty deck — the worst case, and the one that proves the shipped
  // content is sufficient on its own.
  const lexicon = buildLexicon([])

  it('splits every example sentence', () => {
    const failed = REVISIONS.filter((r) => !segmentThai(r.exampleThai, lexicon)).map(
      (r) => r.exampleThai,
    )
    expect(failed).toEqual([])
  })

  it('splits every card whose headword is itself a sentence', () => {
    const failed = REVISIONS.filter(
      (r) => r.kind === 'phrase' && !segmentThai(r.thai, lexicon),
    ).map((r) => r.thai)
    expect(failed).toEqual([])
  })

  it('puts the words back together exactly as they were written', () => {
    for (const revision of REVISIONS) {
      const segments = segmentThai(revision.exampleThai, lexicon)
      expect(segments?.map((s) => s.text).join('')).toBe(revision.exampleThai)
    }
  })

  it('gives every glossary entry a reading and a meaning', () => {
    const thin = Object.entries(GLOSSARY)
      .filter(([, entry]) => !entry.ipa.trim() || !entry.english.trim())
      .map(([thai]) => thai)
    expect(thin).toEqual([])
  })

  /**
   * The failure this whole approach exists to prevent: เขา is "he", and a
   * looser matcher reports the ขา inside it as "leg".
   */
  it('reads เขา as one word, never as the ขา inside it', () => {
    const segments = segmentThai('เขาต้องผ่าตัดเดือนหน้า', lexicon)
    const words = (segments ?? []).filter((s) => s.gloss).map((s) => s.text)
    expect(words).toContain('เขา')
    expect(words).not.toContain('ขา')
  })
})
