/**
 * Thai vowels, grouped by quality so each short/long pair sits together.
 *
 * Vowel length is phonemic in Thai — it changes both meaning and, in dead
 * syllables, tone. Estonian already gives you the category, so the pairs are
 * presented together rather than as unrelated symbols.
 *
 * `pattern` uses ◌ (dotted circle) to mark where the consonant goes. Thai
 * vowels are written before, after, above, below, or around the consonant they
 * follow in speech, which is the single most disorienting thing about reading
 * Thai — so `position` is a first-class field, not a footnote.
 */

export type VowelLength = 'short' | 'long'

export type VowelPosition =
  | 'after'
  | 'before'
  | 'above'
  | 'below'
  | 'around'
  | 'above-after'
  | 'before-after'

export interface ThaiVowel {
  id: string
  /** Written form with ◌ standing in for the consonant. */
  pattern: string
  ipa: string
  length: VowelLength
  position: VowelPosition
  /** Where the symbol physically sits relative to the consonant. */
  positionNote: string
  /** How to make the sound, in terms of languages you already speak. */
  articulation: string
  /** Vowel-quality group id. */
  group: string
  /** A short real word using it, written and in IPA. */
  exampleThai: string
  exampleIpa: string
  exampleGloss: string
}

export const VOWELS: ThaiVowel[] = [
  {
    id: 'a-short',
    pattern: '◌ะ',
    ipa: 'a',
    length: 'short',
    position: 'after',
    positionNote: 'after the consonant',
    articulation: 'Short open a — Spanish “casa”, Russian “как”, cut off abruptly.',
    group: 'a',
    exampleThai: 'จะ',
    exampleIpa: 'ca',
    exampleGloss: 'will',
  },
  {
    id: 'a-long',
    pattern: '◌า',
    ipa: 'aː',
    length: 'long',
    position: 'after',
    positionNote: 'after the consonant',
    articulation: 'The same a, held roughly twice as long.',
    group: 'a',
    exampleThai: 'มา',
    exampleIpa: 'maː',
    exampleGloss: 'to come',
  },
  {
    id: 'i-short',
    pattern: '◌ิ',
    ipa: 'i',
    length: 'short',
    position: 'above',
    positionNote: 'above the consonant',
    articulation: 'Short i — English “bit”, Spanish “si” clipped.',
    group: 'i',
    exampleThai: 'สิ',
    exampleIpa: 'si',
    exampleGloss: 'particle',
  },
  {
    id: 'i-long',
    pattern: '◌ี',
    ipa: 'iː',
    length: 'long',
    position: 'above',
    positionNote: 'above the consonant',
    articulation: 'Long ee — English “see”, Russian “и”.',
    group: 'i',
    exampleThai: 'ดี',
    exampleIpa: 'diː',
    exampleGloss: 'good',
  },
  {
    id: 'ue-short',
    pattern: '◌ึ',
    ipa: 'ɯ',
    length: 'short',
    position: 'above',
    positionNote: 'above the consonant',
    articulation:
      'Unrounded back vowel — no English equivalent. Say “oo” then flatten your lips wide as if smiling. Russian ы is close.',
    group: 'ɯ',
    exampleThai: 'ถึง',
    exampleIpa: 'tʰɯŋ',
    exampleGloss: 'to reach',
  },
  {
    id: 'ue-long',
    pattern: '◌ื',
    ipa: 'ɯː',
    length: 'long',
    position: 'above',
    positionNote: 'above the consonant',
    articulation: 'The same unrounded vowel, held. Russian ы is your best anchor.',
    group: 'ɯ',
    exampleThai: 'มือ',
    exampleIpa: 'mɯː',
    exampleGloss: 'hand',
  },
  {
    id: 'u-short',
    pattern: '◌ุ',
    ipa: 'u',
    length: 'short',
    position: 'below',
    positionNote: 'below the consonant',
    articulation: 'Short oo — English “put”, Spanish “su” clipped.',
    group: 'u',
    exampleThai: 'ดุ',
    exampleIpa: 'du',
    exampleGloss: 'fierce',
  },
  {
    id: 'u-long',
    pattern: '◌ู',
    ipa: 'uː',
    length: 'long',
    position: 'below',
    positionNote: 'below the consonant',
    articulation: 'Long oo — English “food”, Russian “у”.',
    group: 'u',
    exampleThai: 'ดู',
    exampleIpa: 'duː',
    exampleGloss: 'to look',
  },
  {
    id: 'e-short',
    pattern: 'เ◌ะ',
    ipa: 'e',
    length: 'short',
    position: 'before-after',
    positionNote: 'wraps the consonant — เ before, ะ after',
    articulation: 'Short e — Spanish “peso”, Russian “э”.',
    group: 'e',
    exampleThai: 'เละ',
    exampleIpa: 'le',
    exampleGloss: 'mushy',
  },
  {
    id: 'e-long',
    pattern: 'เ◌',
    ipa: 'eː',
    length: 'long',
    position: 'before',
    positionNote: 'written BEFORE the consonant, spoken after it',
    articulation: 'Long ay without the English glide — Spanish “ley”, German “See”.',
    group: 'e',
    exampleThai: 'เธอ',
    exampleIpa: 'tʰɤː',
    exampleGloss: 'you / she',
  },
  {
    id: 'ae-short',
    pattern: 'แ◌ะ',
    ipa: 'ɛ',
    length: 'short',
    position: 'before-after',
    positionNote: 'wraps the consonant — แ before, ะ after',
    articulation: 'Short open e — English “bet”, clipped.',
    group: 'ɛ',
    exampleThai: 'และ',
    exampleIpa: 'lɛ',
    exampleGloss: 'and',
  },
  {
    id: 'ae-long',
    pattern: 'แ◌',
    ipa: 'ɛː',
    length: 'long',
    position: 'before',
    positionNote: 'written BEFORE the consonant, spoken after it',
    articulation: 'Long open e — English “bat” held, wider than เ◌.',
    group: 'ɛ',
    exampleThai: 'แม่',
    exampleIpa: 'mɛː',
    exampleGloss: 'mother',
  },
  {
    id: 'o-short',
    pattern: 'โ◌ะ',
    ipa: 'o',
    length: 'short',
    position: 'before-after',
    positionNote: 'wraps the consonant — โ before, ะ after',
    articulation: 'Short closed o — Spanish “polo”, clipped.',
    group: 'o',
    exampleThai: 'โต๊ะ',
    exampleIpa: 'to',
    exampleGloss: 'table',
  },
  {
    id: 'o-long',
    pattern: 'โ◌',
    ipa: 'oː',
    length: 'long',
    position: 'before',
    positionNote: 'written BEFORE the consonant, spoken after it',
    articulation: 'Long closed o, no glide — Spanish “no”, German “Boot”.',
    group: 'o',
    exampleThai: 'โต',
    exampleIpa: 'toː',
    exampleGloss: 'big',
  },
  {
    id: 'aw-short',
    pattern: 'เ◌าะ',
    ipa: 'ɔ',
    length: 'short',
    position: 'around',
    positionNote: 'surrounds the consonant — เ before, าะ after',
    articulation: 'Short open o — English “hot” (British), clipped.',
    group: 'ɔ',
    exampleThai: 'เกาะ',
    exampleIpa: 'kɔ',
    exampleGloss: 'island',
  },
  {
    id: 'aw-long',
    pattern: '◌อ',
    ipa: 'ɔː',
    length: 'long',
    position: 'after',
    positionNote: 'after the consonant — the letter อ doing vowel duty',
    articulation: 'Long open o — English “law”, wider than โ◌.',
    group: 'ɔ',
    exampleThai: 'พอ',
    exampleIpa: 'pʰɔː',
    exampleGloss: 'enough',
  },
  {
    id: 'oe-short',
    pattern: 'เ◌อะ',
    ipa: 'ɤ',
    length: 'short',
    position: 'around',
    positionNote: 'surrounds the consonant — เ before, อะ after',
    articulation: 'Short unrounded mid vowel — English “about” schwa, tensed.',
    group: 'ɤ',
    exampleThai: 'เยอะ',
    exampleIpa: 'jɤ',
    exampleGloss: 'a lot',
  },
  {
    id: 'oe-long',
    pattern: 'เ◌อ',
    ipa: 'ɤː',
    length: 'long',
    position: 'around',
    positionNote: 'surrounds the consonant — เ before, อ after',
    articulation: 'Long unrounded mid vowel — English “bird” without the r.',
    group: 'ɤ',
    exampleThai: 'เจอ',
    exampleIpa: 'cɤː',
    exampleGloss: 'to meet',
  },
  {
    id: 'ia',
    pattern: 'เ◌ีย',
    ipa: 'iːa',
    length: 'long',
    position: 'around',
    positionNote: 'surrounds the consonant — เ before, ีย above and after',
    articulation: 'Glide from ee to a — like English “ear” without the r.',
    group: 'ia',
    exampleThai: 'เสีย',
    exampleIpa: 'sǐːa',
    exampleGloss: 'to lose / spoil',
  },
  {
    id: 'uea',
    pattern: 'เ◌ือ',
    ipa: 'ɯːa',
    length: 'long',
    position: 'around',
    positionNote: 'surrounds the consonant — เ before, ือ above and after',
    articulation: 'Glide from the unrounded ɯ to a. No European equivalent.',
    group: 'ɯa',
    exampleThai: 'เสือ',
    exampleIpa: 'sɯ̌ːa',
    exampleGloss: 'tiger',
  },
  {
    id: 'ua',
    pattern: '◌ัว',
    ipa: 'uːa',
    length: 'long',
    position: 'above-after',
    positionNote: 'ั above the consonant, ว after',
    articulation: 'Glide from oo to a — Spanish “cuatro” roughly.',
    group: 'ua',
    exampleThai: 'ตัว',
    exampleIpa: 'tuːa',
    exampleGloss: 'body / classifier',
  },
  {
    id: 'ai-mai-malai',
    pattern: 'ไ◌',
    ipa: 'aj',
    length: 'short',
    position: 'before',
    positionNote: 'written BEFORE the consonant, spoken after it',
    articulation: 'The “i” of English “ice”. The commoner of the two ai spellings.',
    group: 'special',
    exampleThai: 'ไป',
    exampleIpa: 'paj',
    exampleGloss: 'to go',
  },
  {
    id: 'ai-mai-muan',
    pattern: 'ใ◌',
    ipa: 'aj',
    length: 'short',
    position: 'before',
    positionNote: 'written BEFORE the consonant, spoken after it',
    articulation:
      'Identical in sound to ไ◌. Used in only twenty-odd words, which are simply memorised.',
    group: 'special',
    exampleThai: 'ใจ',
    exampleIpa: 'caj',
    exampleGloss: 'heart / mind',
  },
  {
    id: 'ao',
    pattern: 'เ◌า',
    ipa: 'aw',
    length: 'short',
    position: 'around',
    positionNote: 'surrounds the consonant — เ before, า after',
    articulation: 'The “ow” of English “how”.',
    group: 'special',
    exampleThai: 'เขา',
    exampleIpa: 'kʰǎw',
    exampleGloss: 'he / she',
  },
  {
    id: 'am',
    pattern: '◌ำ',
    ipa: 'am',
    length: 'short',
    position: 'above-after',
    positionNote: 'the mark sits above and after the consonant',
    articulation: 'a followed by m — a vowel that carries its own final consonant.',
    group: 'special',
    exampleThai: 'ทำ',
    exampleIpa: 'tʰam',
    exampleGloss: 'to do',
  },
]

export interface VowelGroup {
  id: string
  label: string
  members: string[]
}

export const VOWEL_GROUPS: VowelGroup[] = [
  { id: 'a', label: 'a / aː', members: ['a-short', 'a-long'] },
  { id: 'i', label: 'i / iː', members: ['i-short', 'i-long'] },
  { id: 'ɯ', label: 'ɯ / ɯː', members: ['ue-short', 'ue-long'] },
  { id: 'u', label: 'u / uː', members: ['u-short', 'u-long'] },
  { id: 'e', label: 'e / eː', members: ['e-short', 'e-long'] },
  { id: 'ɛ', label: 'ɛ / ɛː', members: ['ae-short', 'ae-long'] },
  { id: 'o', label: 'o / oː', members: ['o-short', 'o-long'] },
  { id: 'ɔ', label: 'ɔ / ɔː', members: ['aw-short', 'aw-long'] },
  { id: 'ɤ', label: 'ɤ / ɤː', members: ['oe-short', 'oe-long'] },
  { id: 'ia', label: 'iːa', members: ['ia'] },
  { id: 'ɯa', label: 'ɯːa', members: ['uea'] },
  { id: 'ua', label: 'uːa', members: ['ua'] },
  { id: 'special', label: 'aj / aw / am', members: ['ai-mai-malai', 'ai-mai-muan', 'ao', 'am'] },
]

export const VOWELS_BY_ID = new Map(VOWELS.map((v) => [v.id, v]))
export const VOWEL_GROUPS_BY_ID = new Map(VOWEL_GROUPS.map((g) => [g.id, g]))
