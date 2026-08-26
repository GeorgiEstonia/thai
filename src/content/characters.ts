/**
 * The 44 Thai consonants.
 *
 * REVIEW THIS FILE WITH YOUR TUTOR BEFORE DRILLING IT. Everything here — the
 * Paiboon transcriptions, the class assignments, the name meanings — becomes
 * pronunciation you rehearse to automaticity. An error caught now costs a
 * minute; the same error caught in three months costs a habit.
 *
 * Transcription is Paiboon-style, so unaspirated and aspirated stops are
 * distinguished by the letter rather than by an <h>:
 *
 *   g   = ก (unaspirated)          k = ข ค ฆ (aspirated)
 *   d   = ด ฎ                      t = ถ ท ธ ฐ ฑ ฒ (aspirated)
 *   dt  = ต ฏ (unaspirated)        p = ผ พ ภ (aspirated)
 *   b   = บ                        bp = ป (unaspirated)
 *
 * `finalSound` is the sound the letter makes when it CLOSES a syllable, which
 * is usually not the sound it makes when it opens one — Thai allows only eight
 * final consonants (k ng t n p m y w), so many letters collapse onto the same
 * one. `null` means the letter cannot close a syllable at all.
 */

export type ConsonantClass = 'mid' | 'high' | 'low'
export type Frequency = 'common' | 'rare' | 'obsolete'
export type BatchNumber = 1 | 2 | 3 | 4 | 5

export interface ThaiCharacter {
  id: string
  glyph: string
  consonantClass: ConsonantClass
  /** Sound when the letter opens a syllable. */
  initialSound: string
  /** Sound when the letter closes a syllable; null if it never can. */
  finalSound: string | null
  /** The traditional acrophonic name Thais use to spell out loud. */
  nameThai: string
  namePaiboon: string
  nameMeaning: string
  /** Shape hook -> the name's object -> the sound it starts. */
  mnemonic: string
  /** Ids of letters this one is genuinely easy to mix up with, by shape. */
  confusableWith: string[]
  batch: BatchNumber
  frequency: Frequency
}

export const CHARACTERS: ThaiCharacter[] = [
  // ---------------------------------------------------------------------
  // Batch 1 — mid class. The smallest class and the one with the simplest
  // tone behaviour, so it is the cheapest place to start.
  // ---------------------------------------------------------------------
  {
    id: 'ko-kai',
    glyph: 'ก',
    consonantClass: 'mid',
    initialSound: 'g',
    finalSound: 'k',
    nameThai: 'ไก่',
    namePaiboon: 'gɔɔ gài',
    nameMeaning: 'chicken',
    mnemonic:
      'A chicken facing left: the flat top is its back, the notch on the left is its beak, and the tail kicks up on the right. gài — g.',
    confusableWith: ['tho-thung', 'pho-samphao'],
    batch: 1,
    frequency: 'common',
  },
  {
    id: 'cho-chan',
    glyph: 'จ',
    consonantClass: 'mid',
    initialSound: 'j',
    finalSound: 't',
    nameThai: 'จาน',
    namePaiboon: 'jɔɔ jaan',
    nameMeaning: 'plate',
    mnemonic:
      'A plate seen edge-on, tipped on a stand — the little loop is the stand, the long curve is the rim. jaan — j.',
    confusableWith: ['ngo-ngu'],
    batch: 1,
    frequency: 'common',
  },
  {
    id: 'do-dek',
    glyph: 'ด',
    consonantClass: 'mid',
    initialSound: 'd',
    finalSound: 't',
    nameThai: 'เด็ก',
    namePaiboon: 'dɔɔ dèk',
    nameMeaning: 'child',
    mnemonic:
      'A child in a high chair, arms up. The loop is on the LEFT — d for dèk. Its twin ต has the loop on the right.',
    confusableWith: ['to-tao', 'kho-khwai'],
    batch: 1,
    frequency: 'common',
  },
  {
    id: 'to-tao',
    glyph: 'ต',
    consonantClass: 'mid',
    initialSound: 'dt',
    finalSound: 't',
    nameThai: 'เต่า',
    namePaiboon: 'dtɔɔ dtào',
    nameMeaning: 'turtle',
    mnemonic:
      'A turtle poking its head out on the right — that extra point is the head ด lacks. dtào — dt, a hard t with no puff of air.',
    confusableWith: ['do-dek', 'kho-khwai'],
    batch: 1,
    frequency: 'common',
  },
  {
    id: 'bo-baimai',
    glyph: 'บ',
    consonantClass: 'mid',
    initialSound: 'b',
    finalSound: 'p',
    nameThai: 'ใบไม้',
    namePaiboon: 'bɔɔ bai-máai',
    nameMeaning: 'leaf',
    mnemonic:
      'An open cup or a curled leaf, flat across the top. bai-máai — b. Give it a flagpole on the left and it becomes ป.',
    confusableWith: ['po-pla'],
    batch: 1,
    frequency: 'common',
  },
  {
    id: 'po-pla',
    glyph: 'ป',
    consonantClass: 'mid',
    initialSound: 'bp',
    finalSound: 'p',
    nameThai: 'ปลา',
    namePaiboon: 'bpɔɔ bplaa',
    nameMeaning: 'fish',
    mnemonic:
      'บ with a tall mast: a fish in a boat with the sail up. bplaa — bp, a p with no puff of air.',
    confusableWith: ['bo-baimai'],
    batch: 1,
    frequency: 'common',
  },
  {
    id: 'o-ang',
    glyph: 'อ',
    consonantClass: 'mid',
    initialSound: 'ɔ (silent carrier)',
    finalSound: null,
    nameThai: 'อ่าง',
    namePaiboon: 'ɔɔ àang',
    nameMeaning: 'basin',
    mnemonic:
      'A basin in profile — one continuous bowl. àang. It carries no sound of its own: it is the placeholder a vowel sits on when a syllable has no real initial consonant.',
    confusableWith: ['ho-nokhuk'],
    batch: 1,
    frequency: 'common',
  },

  // ---------------------------------------------------------------------
  // Batch 2 — high class. Learn these before their low-class partners in
  // batch 3: the two classes share sounds and differ in tone, and the
  // pairing is what makes the tone rules learnable.
  // ---------------------------------------------------------------------
  {
    id: 'kho-khai',
    glyph: 'ข',
    consonantClass: 'high',
    initialSound: 'k',
    finalSound: 'k',
    nameThai: 'ไข่',
    namePaiboon: 'kɔ̌ɔ kài',
    nameMeaning: 'egg',
    mnemonic:
      'An egg in an egg cup — small loop on top of a stand. kài — k with a puff of air, unlike ก. Its low-class twin ค has the same sound.',
    confusableWith: ['cho-chang', 'kho-khuat'],
    batch: 2,
    frequency: 'common',
  },
  {
    id: 'so-suea',
    glyph: 'ส',
    consonantClass: 'high',
    initialSound: 's',
    finalSound: 't',
    nameThai: 'เสือ',
    namePaiboon: 'sɔ̌ɔ sʉ̌a',
    nameMeaning: 'tiger',
    mnemonic:
      'A tiger sitting up, tail curled behind — the extra hook on the right is what ล lacks. sʉ̌a — s.',
    confusableWith: ['lo-ling'],
    batch: 2,
    frequency: 'common',
  },
  {
    id: 'ho-hip',
    glyph: 'ห',
    consonantClass: 'high',
    initialSound: 'h',
    finalSound: null,
    nameThai: 'หีบ',
    namePaiboon: 'hɔ̌ɔ hìip',
    nameMeaning: 'chest, box',
    mnemonic:
      'A chest with its lid propped open on the left. hìip — h. Worth knowing early: this letter also works silently in front of low-class consonants to lift them into high-class tones.',
    confusableWith: ['lo-chula'],
    batch: 2,
    frequency: 'common',
  },
  {
    id: 'pho-phueng',
    glyph: 'ผ',
    consonantClass: 'high',
    initialSound: 'p',
    finalSound: null,
    nameThai: 'ผึ้ง',
    namePaiboon: 'pɔ̌ɔ pʉ̂ng',
    nameMeaning: 'bee',
    mnemonic:
      'A bee resting on a flower — the stalk on the left is short and stops at the line. pʉ̂ng — p with a puff of air. Grow that stalk tall and you get ฝ (f).',
    confusableWith: ['fo-fa', 'pho-phan', 'fo-fan'],
    batch: 2,
    frequency: 'common',
  },
  {
    id: 'tho-thung',
    glyph: 'ถ',
    consonantClass: 'high',
    initialSound: 't',
    finalSound: 't',
    nameThai: 'ถุง',
    namePaiboon: 'tɔ̌ɔ tǔng',
    nameMeaning: 'sack, bag',
    mnemonic:
      'A sack with a drawstring pulled shut at the top left. tǔng — t with a puff of air. Compare ก: same skeleton, but ถ closes into a loop on the left.',
    confusableWith: ['ko-kai', 'pho-samphao'],
    batch: 2,
    frequency: 'common',
  },
  {
    id: 'fo-fa',
    glyph: 'ฝ',
    consonantClass: 'high',
    initialSound: 'f',
    finalSound: null,
    nameThai: 'ฝา',
    namePaiboon: 'fɔ̌ɔ fǎa',
    nameMeaning: 'lid',
    mnemonic:
      'ผ with a tall stalk — a lid with a handle you can lift. fǎa — f. Tall stalk means f; short stalk means p.',
    confusableWith: ['pho-phueng', 'fo-fan', 'pho-phan'],
    batch: 2,
    frequency: 'common',
  },
  {
    id: 'cho-ching',
    glyph: 'ฉ',
    consonantClass: 'high',
    initialSound: 'ch',
    finalSound: null,
    nameThai: 'ฉิ่ง',
    namePaiboon: 'chɔ̌ɔ chìng',
    nameMeaning: 'small cymbals',
    mnemonic:
      'Two small cymbals on a cord, one struck against the other. chìng — ch. Its low-class twin is ช.',
    confusableWith: ['cho-chang'],
    batch: 2,
    frequency: 'common',
  },

  // ---------------------------------------------------------------------
  // Batch 3 — low class, paired by sound with batch 2. Same consonant
  // sounds, different tones. Learning them next to their high-class twins
  // is the whole point of the ordering.
  // ---------------------------------------------------------------------
  {
    id: 'kho-khwai',
    glyph: 'ค',
    consonantClass: 'low',
    initialSound: 'k',
    finalSound: 'k',
    nameThai: 'ควาย',
    namePaiboon: 'kɔɔ kwaai',
    nameMeaning: 'water buffalo',
    mnemonic:
      'A buffalo head with a horn curling back on the left. kwaai — k, same sound as ข but low class, so it takes different tones.',
    confusableWith: ['do-dek', 'to-tao', 'kho-khon', 'kho-rakhang'],
    batch: 3,
    frequency: 'common',
  },
  {
    id: 'cho-chang',
    glyph: 'ช',
    consonantClass: 'low',
    initialSound: 'ch',
    finalSound: 't',
    nameThai: 'ช้าง',
    namePaiboon: 'chɔɔ cháang',
    nameMeaning: 'elephant',
    mnemonic:
      'An elephant with its trunk raised on the right — that raised trunk is what ข does not have. cháang — ch.',
    confusableWith: ['kho-khai', 'cho-ching', 'so-so'],
    batch: 3,
    frequency: 'common',
  },
  {
    id: 'tho-thahan',
    glyph: 'ท',
    consonantClass: 'low',
    initialSound: 't',
    finalSound: 't',
    nameThai: 'ทหาร',
    namePaiboon: 'tɔɔ tá-hǎan',
    nameMeaning: 'soldier',
    mnemonic:
      'A soldier standing at attention, shoulders square. tá-hǎan — t with a puff of air, the low-class partner of ถ.',
    confusableWith: ['tho-montho', 'pho-phan'],
    batch: 3,
    frequency: 'common',
  },
  {
    id: 'pho-phan',
    glyph: 'พ',
    consonantClass: 'low',
    initialSound: 'p',
    finalSound: 'p',
    nameThai: 'พาน',
    namePaiboon: 'pɔɔ paan',
    nameMeaning: 'offering tray',
    mnemonic:
      'A footed offering tray, two feet on the ground. paan — p, the low-class partner of ผ. Add a tall stalk and it becomes ฟ (f).',
    confusableWith: ['fo-fan', 'pho-phueng', 'fo-fa', 'tho-thahan'],
    batch: 3,
    frequency: 'common',
  },
  {
    id: 'fo-fan',
    glyph: 'ฟ',
    consonantClass: 'low',
    initialSound: 'f',
    finalSound: 'p',
    nameThai: 'ฟัน',
    namePaiboon: 'fɔɔ fan',
    nameMeaning: 'teeth',
    mnemonic:
      'พ with a tall stalk — teeth with a raised toothbrush. fan — f. The same tall-stalk-means-f rule as ผ to ฝ.',
    confusableWith: ['pho-phan', 'fo-fa', 'pho-phueng'],
    batch: 3,
    frequency: 'common',
  },
  {
    id: 'so-so',
    glyph: 'ซ',
    consonantClass: 'low',
    initialSound: 's',
    finalSound: 't',
    nameThai: 'โซ่',
    namePaiboon: 'sɔɔ sôo',
    nameMeaning: 'chain',
    mnemonic:
      'ช with a link hooked onto its tail — a chain. sôo — s, the low-class counterpart of ส.',
    confusableWith: ['cho-chang'],
    batch: 3,
    frequency: 'common',
  },
  {
    id: 'ho-nokhuk',
    glyph: 'ฮ',
    consonantClass: 'low',
    initialSound: 'h',
    finalSound: null,
    nameThai: 'นกฮูก',
    namePaiboon: 'hɔɔ nók-hûuk',
    nameMeaning: 'owl',
    mnemonic:
      'อ with a raised tuft on the left — an owl with an ear tuft. nók-hûuk — h, the low-class partner of ห. Last letter of the alphabet.',
    confusableWith: ['o-ang'],
    batch: 3,
    frequency: 'common',
  },

  // ---------------------------------------------------------------------
  // Batch 4 — low-class sonorants. All common, none have a high-class twin,
  // and several are the letters that most often close a syllable.
  // ---------------------------------------------------------------------
  {
    id: 'ngo-ngu',
    glyph: 'ง',
    consonantClass: 'low',
    initialSound: 'ng',
    finalSound: 'ng',
    nameThai: 'งู',
    namePaiboon: 'ngɔɔ nguu',
    nameMeaning: 'snake',
    mnemonic:
      'A snake rearing up, coiled at the base. nguu — ng, the sound at the END of English "sing", except Thai puts it at the start too.',
    confusableWith: ['cho-chan'],
    batch: 4,
    frequency: 'common',
  },
  {
    id: 'yo-ying',
    glyph: 'ญ',
    consonantClass: 'low',
    initialSound: 'y',
    finalSound: 'n',
    nameThai: 'หญิง',
    namePaiboon: 'yɔɔ yǐng',
    nameMeaning: 'woman',
    mnemonic:
      'A woman in a long skirt — the trailing tail below the line is the hem. yǐng — y at the start of a syllable, but n at the end.',
    confusableWith: ['yo-yak', 'no-nen'],
    batch: 4,
    frequency: 'common',
  },
  {
    id: 'no-nu',
    glyph: 'น',
    consonantClass: 'low',
    initialSound: 'n',
    finalSound: 'n',
    nameThai: 'หนู',
    namePaiboon: 'nɔɔ nǔu',
    nameMeaning: 'mouse',
    mnemonic:
      'A mouse with one ear up. Count the humps: น has ONE loop on the left, ม has one on the right. nǔu — n.',
    confusableWith: ['mo-ma'],
    batch: 4,
    frequency: 'common',
  },
  {
    id: 'mo-ma',
    glyph: 'ม',
    consonantClass: 'low',
    initialSound: 'm',
    finalSound: 'm',
    nameThai: 'ม้า',
    namePaiboon: 'mɔɔ máa',
    nameMeaning: 'horse',
    mnemonic:
      'A horse in profile, loop on the RIGHT where น has it on the left. máa — m.',
    confusableWith: ['no-nu'],
    batch: 4,
    frequency: 'common',
  },
  {
    id: 'yo-yak',
    glyph: 'ย',
    consonantClass: 'low',
    initialSound: 'y',
    finalSound: 'y',
    nameThai: 'ยักษ์',
    namePaiboon: 'yɔɔ yák',
    nameMeaning: 'giant, ogre',
    mnemonic:
      'A giant with a club over its shoulder. yák — y. The commoner of the two y letters; ญ is the other.',
    confusableWith: ['yo-ying'],
    batch: 4,
    frequency: 'common',
  },
  {
    id: 'ro-ruea',
    glyph: 'ร',
    consonantClass: 'low',
    initialSound: 'r',
    finalSound: 'n',
    nameThai: 'เรือ',
    namePaiboon: 'rɔɔ rʉa',
    nameMeaning: 'boat',
    mnemonic:
      'A boat with a mast — the loop is the hull, the upright is the mast. rʉa — r at the start, but n at the end of a syllable.',
    confusableWith: ['tho-thong', 'wo-waen'],
    batch: 4,
    frequency: 'common',
  },
  {
    id: 'lo-ling',
    glyph: 'ล',
    consonantClass: 'low',
    initialSound: 'l',
    finalSound: 'n',
    nameThai: 'ลิง',
    namePaiboon: 'lɔɔ ling',
    nameMeaning: 'monkey',
    mnemonic:
      'A monkey hanging by one arm — no curled tail on the right, which is exactly how it differs from ส. ling — l at the start, n at the end.',
    confusableWith: ['so-suea'],
    batch: 4,
    frequency: 'common',
  },
  {
    id: 'wo-waen',
    glyph: 'ว',
    consonantClass: 'low',
    initialSound: 'w',
    finalSound: 'w',
    nameThai: 'แหวน',
    namePaiboon: 'wɔɔ wɛ̌ɛn',
    nameMeaning: 'ring',
    mnemonic:
      'A ring — one closed loop and nothing else, no mast like ร. wɛ̌ɛn — w.',
    confusableWith: ['ro-ruea'],
    batch: 4,
    frequency: 'common',
  },

  // ---------------------------------------------------------------------
  // Batch 5 — the long tail. Two are obsolete and the rest appear mostly in
  // Pali/Sanskrit loanwords and formal vocabulary. Recognition matters here;
  // production almost never does.
  // ---------------------------------------------------------------------
  {
    id: 'kho-khuat',
    glyph: 'ฃ',
    consonantClass: 'high',
    initialSound: 'k',
    finalSound: 'k',
    nameThai: 'ขวด',
    namePaiboon: 'kɔ̌ɔ kùuat',
    nameMeaning: 'bottle',
    mnemonic:
      'ข with a notch in its back — a bottle. OBSOLETE: no longer used in modern Thai, replaced everywhere by ข. Recognise it on old signage and move on.',
    confusableWith: ['kho-khai', 'kho-khon'],
    batch: 5,
    frequency: 'obsolete',
  },
  {
    id: 'kho-khon',
    glyph: 'ฅ',
    consonantClass: 'low',
    initialSound: 'k',
    finalSound: 'k',
    nameThai: 'คน',
    namePaiboon: 'kɔɔ kon',
    nameMeaning: 'person',
    mnemonic:
      'ค with a notch — a person. OBSOLETE, replaced everywhere by ค. Its pair with ฃ is the only reason to know it exists.',
    confusableWith: ['kho-khwai', 'kho-khuat'],
    batch: 5,
    frequency: 'obsolete',
  },
  {
    id: 'kho-rakhang',
    glyph: 'ฆ',
    consonantClass: 'low',
    initialSound: 'k',
    finalSound: 'k',
    nameThai: 'ระฆัง',
    namePaiboon: 'kɔɔ rá-kang',
    nameMeaning: 'bell',
    mnemonic:
      'A hanging temple bell with the clapper below. rá-kang — k, same as ค. Rare; mostly Pali loanwords.',
    confusableWith: ['kho-khwai'],
    batch: 5,
    frequency: 'rare',
  },
  {
    id: 'cho-choe',
    glyph: 'ฌ',
    consonantClass: 'low',
    initialSound: 'ch',
    finalSound: 't',
    nameThai: 'เฌอ',
    namePaiboon: 'chɔɔ chəə',
    nameMeaning: 'tree, bush',
    mnemonic:
      'A bush with branches spreading either side. chəə — ch. Rare: you will meet it in a handful of words and little else.',
    confusableWith: ['no-nen'],
    batch: 5,
    frequency: 'rare',
  },
  {
    id: 'do-chada',
    glyph: 'ฎ',
    consonantClass: 'mid',
    initialSound: 'd',
    finalSound: 't',
    nameThai: 'ชฎา',
    namePaiboon: 'dɔɔ chá-daa',
    nameMeaning: 'ceremonial headdress',
    mnemonic:
      'A tall dancer\'s headdress with a tail sweeping below the line. chá-daa — d, same sound as ด. The tail curls LEFT at the bottom; ฏ points right.',
    confusableWith: ['to-patak', 'tho-than'],
    batch: 5,
    frequency: 'rare',
  },
  {
    id: 'to-patak',
    glyph: 'ฏ',
    consonantClass: 'mid',
    initialSound: 'dt',
    finalSound: 't',
    nameThai: 'ปฏัก',
    namePaiboon: 'dtɔɔ bpà-dtàk',
    nameMeaning: 'goad, cattle prod',
    mnemonic:
      'A goad — the point at the bottom right is the business end, and it is the only thing separating it from ฎ. bpà-dtàk — dt, same sound as ต.',
    confusableWith: ['do-chada', 'tho-than'],
    batch: 5,
    frequency: 'rare',
  },
  {
    id: 'tho-than',
    glyph: 'ฐ',
    consonantClass: 'high',
    initialSound: 't',
    finalSound: 't',
    nameThai: 'ฐาน',
    namePaiboon: 'tɔ̌ɔ tǎan',
    nameMeaning: 'pedestal, base',
    mnemonic:
      'A pedestal — note it sits ON the line with a flat foot, where ฎ and ฏ hang below it. tǎan — t. Common enough in formal words to be worth knowing.',
    confusableWith: ['do-chada', 'to-patak'],
    batch: 5,
    frequency: 'common',
  },
  {
    id: 'tho-montho',
    glyph: 'ฑ',
    consonantClass: 'low',
    initialSound: 't',
    finalSound: 't',
    nameThai: 'มณโฑ',
    namePaiboon: 'tɔɔ mon-too',
    nameMeaning: 'Montho (a Ramakien character)',
    mnemonic:
      'A seated figure in a gown. mon-too — t. Rare, and mostly in names and Pali loanwords.',
    confusableWith: ['tho-thahan', 'tho-phuthao'],
    batch: 5,
    frequency: 'rare',
  },
  {
    id: 'tho-phuthao',
    glyph: 'ฒ',
    consonantClass: 'low',
    initialSound: 't',
    finalSound: 't',
    nameThai: 'ผู้เฒ่า',
    namePaiboon: 'tɔɔ pʉ̂u-tâo',
    nameMeaning: 'elder',
    mnemonic:
      'ฑ with a raised arm — an elder leaning on a staff. pʉ̂u-tâo — t. Rare.',
    confusableWith: ['tho-montho'],
    batch: 5,
    frequency: 'rare',
  },
  {
    id: 'no-nen',
    glyph: 'ณ',
    consonantClass: 'low',
    initialSound: 'n',
    finalSound: 'n',
    nameThai: 'เณร',
    namePaiboon: 'nɔɔ neen',
    nameMeaning: 'novice monk',
    mnemonic:
      'A novice monk with a shaved head, seated. neen — n, same sound as น. Appears in plenty of formal and Pali-derived words.',
    confusableWith: ['cho-choe', 'yo-ying'],
    batch: 5,
    frequency: 'common',
  },
  {
    id: 'tho-thong',
    glyph: 'ธ',
    consonantClass: 'low',
    initialSound: 't',
    finalSound: 't',
    nameThai: 'ธง',
    namePaiboon: 'tɔɔ tong',
    nameMeaning: 'flag',
    mnemonic:
      'A flag on a pole — closed loop at the top where ร is open. tong — t, same sound as ท. Common in formal vocabulary.',
    confusableWith: ['ro-ruea'],
    batch: 5,
    frequency: 'common',
  },
  {
    id: 'pho-samphao',
    glyph: 'ภ',
    consonantClass: 'low',
    initialSound: 'p',
    finalSound: 'p',
    nameThai: 'สำเภา',
    namePaiboon: 'pɔɔ sǎm-pao',
    nameMeaning: 'sailing junk',
    mnemonic:
      'A junk under sail — the same skeleton as ก and ถ, but with the sail filled out on the left. sǎm-pao — p, same sound as พ.',
    confusableWith: ['ko-kai', 'tho-thung'],
    batch: 5,
    frequency: 'common',
  },
  {
    id: 'so-sala',
    glyph: 'ศ',
    consonantClass: 'high',
    initialSound: 's',
    finalSound: 't',
    nameThai: 'ศาลา',
    namePaiboon: 'sɔ̌ɔ sǎa-laa',
    nameMeaning: 'pavilion',
    mnemonic:
      'An open-sided pavilion with a peaked roof. sǎa-laa — s, same sound as ส. Common in Sanskrit-derived words.',
    confusableWith: ['so-ruesi'],
    batch: 5,
    frequency: 'common',
  },
  {
    id: 'so-ruesi',
    glyph: 'ษ',
    consonantClass: 'high',
    initialSound: 's',
    finalSound: 't',
    nameThai: 'ฤๅษี',
    namePaiboon: 'sɔ̌ɔ rʉʉ-sǐi',
    nameMeaning: 'hermit, ascetic',
    mnemonic:
      'A hermit seated with a topknot. rʉʉ-sǐi — s. Shows up in Sanskrit loanwords, often alongside ศ.',
    confusableWith: ['so-sala'],
    batch: 5,
    frequency: 'common',
  },
  {
    id: 'lo-chula',
    glyph: 'ฬ',
    consonantClass: 'low',
    initialSound: 'l',
    finalSound: 'n',
    nameThai: 'จุฬา',
    namePaiboon: 'lɔɔ jù-laa',
    nameMeaning: 'kite',
    mnemonic:
      'A star-shaped kite with a tail. jù-laa — l, same sound as ล. Rare, but it is in the name of Chulalongkorn.',
    confusableWith: ['ho-hip'],
    batch: 5,
    frequency: 'rare',
  },
]

export const BATCHES: BatchNumber[] = [1, 2, 3, 4, 5]

export const CHARACTERS_BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]))

export function charactersInBatch(batch: BatchNumber): ThaiCharacter[] {
  return CHARACTERS.filter((c) => c.batch === batch)
}
