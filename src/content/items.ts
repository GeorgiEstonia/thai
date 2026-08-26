import { CHARACTERS, type ThaiCharacter } from './characters'
import { PHONEME_BY_CHAR, PHONEME_GROUPS, type Phoneme } from './phonemes'
import { VOWELS, VOWEL_GROUPS, type ThaiVowel } from './vowels'

/**
 * One flat list of everything that can be practised, so a session can mix
 * consonants and vowels freely rather than treating them as separate decks.
 */

export type ItemType = 'character' | 'vowel' | 'word'

/**
 * The two directions, which are separate skills and separately scheduled:
 *
 *   recognise — Thai on the front, IPA on the back. The reading skill.
 *   produce   — IPA on the front, Thai on the back. Much harder, because
 *               several letters share one sound: /tʰ/ has six.
 */
export type Direction = 'recognise' | 'produce'

export const DIRECTIONS: Direction[] = ['recognise', 'produce']

export const DIRECTION_LABELS: Record<Direction, string> = {
  recognise: 'Thai → IPA',
  produce: 'IPA → Thai',
}

/** Words are prompted by meaning, not by sound, so they get their own labels. */
export const WORD_DIRECTION_LABELS: Record<Direction, string> = {
  recognise: 'Thai → English',
  produce: 'English → Thai',
}

/** The single selectable group all vocabulary lives in. */
export const WORDS_GROUP = 'words'

export interface WordRecord {
  id: string
  thai: string
  ipa: string
  english: string
  notes: string | null
}

interface ItemBase {
  id: string
  /** Selection group — a phoneme group id for consonants, a vowel group id. */
  group: string
  /** What is written. */
  thai: string
  /** The sound, in IPA. */
  ipa: string
}

export type PracticeItem =
  | (ItemBase & { type: 'character'; character: ThaiCharacter; phoneme: Phoneme })
  | (ItemBase & { type: 'vowel'; vowel: ThaiVowel })
  | (ItemBase & { type: 'word'; word: WordRecord })

/** Words come from the database, so they are built per-request, not at import. */
export function wordItem(word: WordRecord): PracticeItem {
  return {
    type: 'word',
    id: word.id,
    group: WORDS_GROUP,
    thai: word.thai,
    ipa: word.ipa,
    word,
  }
}

function characterItems(): PracticeItem[] {
  const groupOf = new Map<string, string>()
  for (const group of PHONEME_GROUPS) {
    for (const member of group.members) groupOf.set(member, group.id)
  }

  return CHARACTERS.map((character): PracticeItem => {
    const phoneme = PHONEME_BY_CHAR[character.id]
    return {
      type: 'character',
      id: character.id,
      group: groupOf.get(character.id) ?? phoneme.ipa,
      thai: character.glyph,
      ipa: phoneme.ipa,
      character,
      phoneme,
    }
  })
}

function vowelItems(): PracticeItem[] {
  return VOWELS.map((vowel): PracticeItem => ({
    type: 'vowel',
    id: vowel.id,
    group: vowel.group,
    thai: vowel.pattern,
    ipa: vowel.ipa,
    vowel,
  }))
}

export const PRACTICE_ITEMS: PracticeItem[] = [...characterItems(), ...vowelItems()]

export const PRACTICE_ITEMS_BY_KEY = new Map(
  PRACTICE_ITEMS.map((item) => [`${item.type}:${item.id}`, item]),
)

export function findItem(type: ItemType, id: string): PracticeItem | undefined {
  return PRACTICE_ITEMS_BY_KEY.get(`${type}:${id}`)
}

/** Stable key for a scheduled card: one item practised in one direction. */
export function cardKey(type: ItemType, id: string, direction: Direction): string {
  return `${type}:${id}:${direction}`
}

export function parseCardKey(
  key: string,
): { type: ItemType; id: string; direction: Direction } | null {
  const [type, id, direction] = key.split(':')
  if ((type !== 'character' && type !== 'vowel') || !id) return null
  if (direction !== 'recognise' && direction !== 'produce') return null
  return { type, id, direction }
}

/** Every selectable group, consonants first, in teaching order. */
export interface SelectableGroup {
  id: string
  kind: ItemType
  label: string
  /** Glyphs shown on the selection screen so a group is recognisable at a glance. */
  preview: string[]
  count: number
}

export const SELECTABLE_GROUPS: SelectableGroup[] = [
  ...PHONEME_GROUPS.map((group) => ({
    id: group.id,
    kind: 'character' as const,
    label: `/${group.id}/`,
    preview: group.members
      .map((memberId) => CHARACTERS.find((c) => c.id === memberId)?.glyph ?? '')
      .filter(Boolean),
    count: group.members.length,
  })),
  ...VOWEL_GROUPS.map((group) => ({
    id: group.id,
    kind: 'vowel' as const,
    label: `/${group.label}/`,
    preview: group.members
      .map((memberId) => VOWELS.find((v) => v.id === memberId)?.pattern ?? '')
      .filter(Boolean),
    count: group.members.length,
  })),
]

/**
 * How many practice items share a given sound. Six letters are all /tʰ/, so an
 * "IPA → Thai" prompt showing only /tʰ/ has six correct answers and is not a
 * fair question.
 */
const ITEMS_PER_SOUND = PRACTICE_ITEMS.reduce<Record<string, number>>((counts, item) => {
  counts[`${item.type}:${item.ipa}`] = (counts[`${item.type}:${item.ipa}`] ?? 0) + 1
  return counts
}, {})

export function soundIsShared(item: PracticeItem): boolean {
  // A word is identified by its meaning, so a shared sound is not ambiguous.
  if (item.type === 'word') return false
  return (ITEMS_PER_SOUND[`${item.type}:${item.ipa}`] ?? 0) > 1
}

/**
 * The disambiguator shown alongside the IPA on a produce card. For consonants
 * this is the acrophonic name — which is exactly how Thais themselves specify
 * which of the six /tʰ/ letters they mean.
 */
export function produceHint(item: PracticeItem): string | null {
  if (!soundIsShared(item)) return null
  if (item.type === 'character') return `${item.character.nameThai} — ${item.character.nameMeaning}`
  if (item.type === 'vowel') return `as in ${item.vowel.exampleThai} (${item.vowel.exampleGloss})`
  return null
}
