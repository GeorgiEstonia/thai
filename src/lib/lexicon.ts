import type { WordRecord } from '@/content/items'

import { GLOSSARY } from '@/content/glossary'
import { LESSON_SETS } from '@/content/lessons'

import type { Lexicon } from './segment'

/**
 * Everything a sentence might be split into, with what each word means.
 *
 * Three layers, in this order:
 *
 *  1. Your own cards, so tapping a word you have a card for says what your
 *     card says rather than offering a second opinion.
 *  2. The vocabulary that ships with the app.
 *  3. The shipped glossary — the particles, pronouns and place names that
 *     hold sentences together without ever having been worth a card.
 *
 * Two and three matter because they ship. Built from the database alone, a
 * deleted card would quietly stop a sentence being readable — and it would
 * stop being readable for every other word that shares it, with nothing on
 * screen to say why. The shipped layers alone can split every example the app
 * carries, so the deck can only improve the wording, never break the split.
 *
 * It lives in its own module because the phrase gate needs it too: whether a
 * sentence can be looked up word by word decides how much of it you are
 * allowed not to know. See lib/unlock.ts.
 */
export function buildLexicon(vocabulary: WordRecord[]): Lexicon {
  const lexicon: Lexicon = new Map()

  for (const word of vocabulary) {
    if (word.kind !== 'word') continue
    const thai = word.thai.trim()
    if (!thai || lexicon.has(thai)) continue
    lexicon.set(thai, { ipa: word.ipa ?? '', english: word.english })
  }

  for (const set of LESSON_SETS) {
    for (const item of set.items) {
      if ((item.kind ?? 'word') !== 'word') continue
      const thai = item.thai.trim()
      if (!thai || lexicon.has(thai)) continue
      lexicon.set(thai, { ipa: item.ipa ?? '', english: item.english })
    }
  }

  for (const [thai, entry] of Object.entries(GLOSSARY)) {
    if (!lexicon.has(thai)) lexicon.set(thai, entry)
  }

  return lexicon
}
