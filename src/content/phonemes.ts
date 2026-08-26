/**
 * IPA phoneme groups — the organising principle for practice.
 *
 * Characters are grouped by the sound they make, not by alphabet order, so a
 * session can be "the aspirated stops" or "the /s/ letters" rather than an
 * arbitrary slice. Several Thai letters share one phoneme (six letters are all
 * /tʰ/), and that redundancy is much easier to absorb as a set than as six
 * unrelated cards.
 *
 * Transcription follows the c / cʰ convention for จ and ฉ ช ฌ rather than the
 * tɕ / tɕʰ used in some references — both describe the same sound; this is the
 * one you're already using.
 *
 * Finals use the same symbols without release diacritics: Thai only permits
 * k, ŋ, t, n, p, m, j, w in syllable-final position.
 */

export interface Phoneme {
  /** IPA for the sound this letter makes when it opens a syllable. */
  ipa: string
  /** IPA when it closes a syllable; null if it never can. */
  ipaFinal: string | null
}

export const PHONEME_BY_CHAR: Record<string, Phoneme> = {
  'ko-kai': { ipa: 'k', ipaFinal: 'k' },

  'kho-khai': { ipa: 'kʰ', ipaFinal: 'k' },
  'kho-khuat': { ipa: 'kʰ', ipaFinal: 'k' },
  'kho-khwai': { ipa: 'kʰ', ipaFinal: 'k' },
  'kho-khon': { ipa: 'kʰ', ipaFinal: 'k' },
  'kho-rakhang': { ipa: 'kʰ', ipaFinal: 'k' },

  'ngo-ngu': { ipa: 'ŋ', ipaFinal: 'ŋ' },

  'cho-chan': { ipa: 'c', ipaFinal: 't' },

  'cho-ching': { ipa: 'cʰ', ipaFinal: null },
  'cho-chang': { ipa: 'cʰ', ipaFinal: 't' },
  'cho-choe': { ipa: 'cʰ', ipaFinal: 't' },

  'so-so': { ipa: 's', ipaFinal: 't' },
  'so-sala': { ipa: 's', ipaFinal: 't' },
  'so-ruesi': { ipa: 's', ipaFinal: 't' },
  'so-suea': { ipa: 's', ipaFinal: 't' },

  'yo-ying': { ipa: 'j', ipaFinal: 'n' },
  'yo-yak': { ipa: 'j', ipaFinal: 'j' },

  'do-chada': { ipa: 'd', ipaFinal: 't' },
  'do-dek': { ipa: 'd', ipaFinal: 't' },

  'to-patak': { ipa: 't', ipaFinal: 't' },
  'to-tao': { ipa: 't', ipaFinal: 't' },

  'tho-than': { ipa: 'tʰ', ipaFinal: 't' },
  'tho-montho': { ipa: 'tʰ', ipaFinal: 't' },
  'tho-phuthao': { ipa: 'tʰ', ipaFinal: 't' },
  'tho-thung': { ipa: 'tʰ', ipaFinal: 't' },
  'tho-thahan': { ipa: 'tʰ', ipaFinal: 't' },
  'tho-thong': { ipa: 'tʰ', ipaFinal: 't' },

  'no-nen': { ipa: 'n', ipaFinal: 'n' },
  'no-nu': { ipa: 'n', ipaFinal: 'n' },

  'bo-baimai': { ipa: 'b', ipaFinal: 'p' },
  'po-pla': { ipa: 'p', ipaFinal: 'p' },

  'pho-phueng': { ipa: 'pʰ', ipaFinal: null },
  'pho-phan': { ipa: 'pʰ', ipaFinal: 'p' },
  'pho-samphao': { ipa: 'pʰ', ipaFinal: 'p' },

  'fo-fa': { ipa: 'f', ipaFinal: null },
  'fo-fan': { ipa: 'f', ipaFinal: 'p' },

  'mo-ma': { ipa: 'm', ipaFinal: 'm' },
  'ro-ruea': { ipa: 'r', ipaFinal: 'n' },

  'lo-ling': { ipa: 'l', ipaFinal: 'n' },
  'lo-chula': { ipa: 'l', ipaFinal: 'n' },

  'wo-waen': { ipa: 'w', ipaFinal: 'w' },

  'ho-hip': { ipa: 'h', ipaFinal: null },
  'ho-nokhuk': { ipa: 'h', ipaFinal: null },

  'o-ang': { ipa: 'ʔ', ipaFinal: null },
}

export interface PhonemeGroup {
  /** IPA symbol, used as the id. */
  id: string
  /** How to produce it, in terms of sounds you already have. */
  articulation: string
  /** Anchors in languages you already speak. Empty when there is no good one. */
  anchors: string[]
  /** Character ids in this group. */
  members: string[]
}

/**
 * Ordered the way the traditional groups run — velars, palatals, dentals,
 * labials, then the rest — because that ordering puts each sound next to the
 * ones it contrasts with.
 */
export const PHONEME_GROUPS: PhonemeGroup[] = [
  {
    id: 'k',
    articulation: 'Unaspirated k — no puff of air. Hold a palm to your mouth: it should stay still.',
    anchors: ['Russian кот', 'Spanish casa', 'English skate (never kite)'],
    members: ['ko-kai'],
  },
  {
    id: 'kʰ',
    articulation: 'Aspirated k — a clear puff of air after the release.',
    anchors: ['English kite', 'German Kind'],
    members: ['kho-khai', 'kho-khwai', 'kho-rakhang', 'kho-khuat', 'kho-khon'],
  },
  {
    id: 'ŋ',
    articulation:
      'The ng of “sing”, but at the START of a syllable. Say “sing”, freeze on the final consonant, hold it, then release into the vowel.',
    anchors: ['English sing (final only)', 'Spanish tengo'],
    members: ['ngo-ngu'],
  },
  {
    id: 'c',
    articulation:
      'Unaspirated palatal stop — between English “j” and “ch”, with no puff. Closer to the j of “jar” but voiceless.',
    anchors: ['Spanish muchacho (roughly, unaspirated)'],
    members: ['cho-chan'],
  },
  {
    id: 'cʰ',
    articulation: 'Aspirated version of the same — English “ch” in “chair”.',
    anchors: ['English chair', 'Russian чай'],
    members: ['cho-chang', 'cho-ching', 'cho-choe'],
  },
  {
    id: 's',
    articulation: 'Plain s. Four letters share it; only the class differs.',
    anchors: ['English sun', 'Russian сон', 'Spanish sol'],
    members: ['so-suea', 'so-so', 'so-sala', 'so-ruesi'],
  },
  {
    id: 'j',
    articulation: 'English “y” in “yes” — not the “j” of “jam”.',
    anchors: ['English yes', 'Russian йод', 'German ja'],
    members: ['yo-yak', 'yo-ying'],
  },
  {
    id: 'd',
    articulation: 'Plain voiced d.',
    anchors: ['English dog', 'Russian дом', 'Spanish dedo'],
    members: ['do-dek', 'do-chada'],
  },
  {
    id: 't',
    articulation:
      'Unaspirated t — no puff. This is the one English speakers cannot hear; you can, because Russian and Spanish both have it.',
    anchors: ['Russian тот', 'Spanish taco', 'English stop (never top)'],
    members: ['to-tao', 'to-patak'],
  },
  {
    id: 'tʰ',
    articulation: 'Aspirated t — English “t” in “top”. Six letters share this sound.',
    anchors: ['English top', 'German Tag'],
    members: ['tho-thahan', 'tho-thung', 'tho-thong', 'tho-than', 'tho-montho', 'tho-phuthao'],
  },
  {
    id: 'n',
    articulation: 'Plain n.',
    anchors: ['English no', 'Russian нет'],
    members: ['no-nu', 'no-nen'],
  },
  {
    id: 'b',
    articulation: 'Plain voiced b.',
    anchors: ['English bat', 'Russian бок'],
    members: ['bo-baimai'],
  },
  {
    id: 'p',
    articulation: 'Unaspirated p — no puff. Again a sound you already have.',
    anchors: ['Russian пот', 'Spanish papa', 'English spin (never pin)'],
    members: ['po-pla'],
  },
  {
    id: 'pʰ',
    articulation: 'Aspirated p — English “p” in “pin”. Note it is never an “f” sound.',
    anchors: ['English pin', 'German Panne'],
    members: ['pho-phan', 'pho-phueng', 'pho-samphao'],
  },
  {
    id: 'f',
    articulation: 'Plain f.',
    anchors: ['English fan', 'Spanish faro'],
    members: ['fo-fan', 'fo-fa'],
  },
  {
    id: 'm',
    articulation: 'Plain m.',
    anchors: ['English man', 'Russian мама'],
    members: ['mo-ma'],
  },
  {
    id: 'r',
    articulation:
      'A tapped or trilled r, often softened to l in casual speech. Your Spanish r is a good starting point.',
    anchors: ['Spanish pero', 'Russian рот'],
    members: ['ro-ruea'],
  },
  {
    id: 'l',
    articulation: 'Plain l.',
    anchors: ['English let', 'Spanish luna'],
    members: ['lo-ling', 'lo-chula'],
  },
  {
    id: 'w',
    articulation: 'English “w”. Also appears as the second half of a vowel.',
    anchors: ['English wet', 'Spanish huevo'],
    members: ['wo-waen'],
  },
  {
    id: 'h',
    articulation: 'Plain h.',
    anchors: ['English hat', 'German Haus'],
    members: ['ho-hip', 'ho-nokhuk'],
  },
  {
    id: 'ʔ',
    articulation:
      'Glottal stop — the catch in the middle of “uh-oh”. อ carries no sound of its own; it is the placeholder a vowel sits on when a syllable has no real initial consonant.',
    anchors: ['English uh-oh', 'German Beamter'],
    members: ['o-ang'],
  },
]

export const PHONEME_GROUPS_BY_ID = new Map(PHONEME_GROUPS.map((g) => [g.id, g]))

export function groupForChar(charId: string): PhonemeGroup | undefined {
  return PHONEME_GROUPS.find((group) => group.members.includes(charId))
}
