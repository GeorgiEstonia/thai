/**
 * Short rule cards, one per batch.
 *
 * These are available on demand from the drill screen and are never forced in
 * front of a card. The app's job is retrieval practice; the conceptual work
 * belongs in your lessons. What these do is answer "why does this letter's
 * class matter?" at the moment you first meet the class, so the class badge on
 * every card isn't decoration.
 */

import type { BatchNumber } from './characters'

export interface RuleCard {
  batch: BatchNumber
  title: string
  /** Markdown-free plain paragraphs; the UI renders them as separate blocks. */
  body: string[]
}

/**
 * Live vs dead is the other half of every tone rule, so it is stated once here
 * and referenced by the batch cards rather than repeated in each.
 */
export const LIVE_DEAD_NOTE: RuleCard = {
  batch: 1,
  title: 'Live and dead syllables',
  body: [
    'Every tone rule in Thai depends on two things: the class of the initial consonant, and whether the syllable is "live" or "dead".',
    'A syllable is LIVE if it ends in a long vowel or in one of the sonorants ม น ง ย ว.',
    'It is DEAD if it ends in a short vowel or in a stop — the sounds k, t, p, written with ก ด บ and the other letters that collapse onto those finals.',
    'You do not need to produce this from memory yet. You need to recognise that the class badge on each card is the first half of a two-part rule.',
  ],
}

export const RULE_CARDS: RuleCard[] = [
  {
    batch: 1,
    title: 'Mid class — the smallest set',
    body: [
      'These nine letters are the mid class. It is the smallest class and the one whose tones behave most plainly, which is why they come first.',
      'With no tone mark: a live syllable takes the MID tone, a dead syllable takes the LOW tone.',
      'Mid class is also the only class that can carry all four tone marks and produce all five tones, so these letters are worth knowing cold before anything else.',
    ],
  },
  {
    batch: 2,
    title: 'High class — and why it comes before its twins',
    body: [
      'With no tone mark: a live syllable takes the RISING tone, a dead syllable takes the LOW tone.',
      'Most of these letters share a consonant sound with a low-class letter you will meet in the next batch — ข with ค, ส with ซ, ผ with พ, ถ with ท, ฝ with ฟ, ฉ with ช, ห with ฮ.',
      'That pairing is the point. The two letters sound identical; the class is what tells you the tone. Learning them as pairs is why the batches are ordered this way rather than alphabetically.',
    ],
  },
  {
    batch: 3,
    title: 'Low class — the twins, and the split rule',
    body: [
      'Each of these is the low-class partner of a high-class letter from the last batch. Same sound, different tone behaviour.',
      'With no tone mark: a live syllable takes the MID tone. A dead syllable splits on vowel length — short vowel takes the HIGH tone, long vowel takes the FALLING tone.',
      'This split is the one genuinely fiddly rule in the system, and it is the reason vowel length has to be marked in your transcription rather than glossed over.',
    ],
  },
  {
    batch: 4,
    title: 'Sonorants — and the ห trick',
    body: [
      'These low-class letters have no high-class twin, which leaves a gap: there is no high-class way to write ng, n, m, y, r, l, w.',
      'Thai fills the gap with a silent ห placed in front — หน, หม, หย, หล, หว and so on. The ห is not pronounced; it exists only to make the following consonant behave as high class for tone purposes.',
      'This is also the batch where finals start mattering: ญ ร ล all close a syllable as n, not as their initial sound.',
    ],
  },
  {
    batch: 5,
    title: 'The long tail — recognise, do not drill',
    body: [
      'These letters are rare, and two of them — ฃ and ฅ — are fully obsolete. You will meet them in Pali and Sanskrit loanwords, formal vocabulary, names, and old signage.',
      'The goal here is recognition only. You need to know that ธ sounds like ท and that ศ ษ ส are all s, so an unfamiliar letter never stops you reading a word.',
      'Do not spend effort on production. No one will ask you to write ฒ.',
    ],
  },
]

export const RULE_CARDS_BY_BATCH = new Map(RULE_CARDS.map((card) => [card.batch, card]))
