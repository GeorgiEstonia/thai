import {
  DIRECTIONS,
  type Direction,
  PRACTICE_ITEMS,
  type PracticeItem,
  type WordRecord,
  WORDS_GROUP,
  cardKey,
} from '@/content/items'

import { GLOSSARY } from '@/content/glossary'
import { LESSON_SETS } from '@/content/lessons'

import { getDb, schema } from './db'
import { type Lexicon, type Segment, segmentNote, segmentThai } from './segment'
import { learnedWords, gateFor } from './unlock'
import { listWordItems, listWords, loadNotes } from './words'
import { type SrsState, isDue, isLeech, newState } from './srs'

/**
 * Builds the practice deck from an explicit selection of IPA groups.
 *
 * There is no gating here. You choose what to work on each session; the app's
 * job is to schedule what you chose, not to decide it for you.
 */

/** Words and phrases are practised separately — see lib/unlock.ts for why. */
export type VocabKind = 'word' | 'phrase'

/** Stages within a sitting. Characters and vowels sit with the words. */
export const WORD_STAGE = 0
export const SENTENCE_STAGE = 1

export interface Selection {
  /** Group ids to include. Empty means everything. */
  groups: string[]
  directions: Direction[]
  /**
   * Which half of the vocabulary to draw from. Undefined means both, which is
   * what a selection of characters or vowels wants.
   */
  kind?: VocabKind
}

export interface DeckCard {
  key: string
  item: PracticeItem
  direction: Direction
  state: SrsState
  /** A mnemonic you wrote yourself, if there is one. */
  note: string | null
  /**
   * Which stage of the sitting this belongs to: words before the sentences
   * built out of them. A sentence is practice at assembling words you have,
   * so meeting those words a few minutes earlier is most of its value.
   */
  stage: number
  /** The topic, so a sitting can alternate between topics rather than block. */
  lane: string
  /**
   * The example sentence split into words you can tap, or null when it cannot
   * be split exactly. Null rather than a best guess: Thai has no spaces, and a
   * partial split finds ขา "leg" inside เขา "he" and says so confidently.
   */
  exampleTokens: Segment[] | null
  /** The same for a card whose headword is itself a sentence. */
  thaiTokens: Segment[] | null
  /** Words named in the usage note, which already carries their readings. */
  noteTokens: Segment[] | null
}

export function parseSelection(params: {
  groups?: string | string[]
  dirs?: string | string[]
  kind?: string | string[]
}): Selection {
  const asList = (value: string | string[] | undefined): string[] =>
    (Array.isArray(value) ? value.join(',') : (value ?? ''))
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)

  const directions = asList(params.dirs).filter((d): d is Direction =>
    DIRECTIONS.includes(d as Direction),
  )

  const kindValue = Array.isArray(params.kind) ? params.kind[0] : params.kind
  const kind = kindValue === 'word' || kindValue === 'phrase' ? kindValue : undefined

  return {
    groups: asList(params.groups),
    directions: directions.length > 0 ? directions : DIRECTIONS,
    kind,
  }
}

export function serialiseSelection(selection: Selection): string {
  const search = new URLSearchParams()
  if (selection.groups.length > 0) search.set('groups', selection.groups.join(','))
  search.set('dirs', selection.directions.join(','))
  if (selection.kind) search.set('kind', selection.kind)
  return search.toString()
}

/**
 * Items matching a selection. Vocabulary is loaded from the database only when
 * the words group is actually selected.
 */
export async function selectedItems(selection: Selection): Promise<PracticeItem[]> {
  const wanted = new Set(selection.groups)
  const includeAll = selection.groups.length === 0

  const staticItems = includeAll
    ? PRACTICE_ITEMS
    : PRACTICE_ITEMS.filter((item) => wanted.has(item.group))

  // Vocabulary groups are per-pack ("pack:Food"), plus "words" for ungrouped —
  // so any of those means the deck has to be loaded, not just the literal one.
  const wantsWords =
    includeAll ||
    selection.groups.some((group) => group === WORDS_GROUP || group.startsWith('pack:'))

  const words = wantsWords
    ? (await listWordItems()).filter((item) => includeAll || wanted.has(item.group))
    : []

  return [...staticItems, ...words]
}

export async function loadProgress(): Promise<Map<string, SrsState>> {
  const rows = await getDb().select().from(schema.itemProgress)

  return new Map(
    rows.map((row) => [
      cardKey(row.itemType, row.itemId, row.direction),
      {
        intervalDays: row.intervalDays,
        dueAt: row.dueAt,
        reps: row.reps,
        lapses: row.lapses,
      },
    ]),
  )
}

/**
 * Keeps only the vocabulary this selection should actually show.
 *
 * Two filters, both about not being shown a card you have no way to answer:
 * the chosen half of the deck (words or phrases), and — for phrases — whether
 * the words inside it have been learned yet.
 */
function applyVocabRules(
  items: PracticeItem[],
  selection: Selection,
  progress: Map<string, SrsState>,
  vocabulary: WordRecord[],
): PracticeItem[] {
  const hasVocab = items.some((item) => item.type === 'word')
  if (!hasVocab) return items

  const learned = learnedWords(vocabulary, progress)

  return items.filter((item) => {
    if (item.type !== 'word') return true
    if (selection.kind && item.word.kind !== selection.kind) return false
    if (item.word.kind !== 'phrase') return true
    return gateFor(item.word, vocabulary, learned).unlocked
  })
}

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

/** Every card (item × direction) implied by a selection, with its schedule. */
export async function loadDeck(selection: Selection, now: Date): Promise<DeckCard[]> {
  const [progress, allItems, notes] = await Promise.all([
    loadProgress(),
    selectedItems(selection),
    loadNotes(),
  ])

  const vocabulary = allItems.some((item) => item.type === 'word') ? await listWords() : []
  const items = applyVocabRules(allItems, selection, progress, vocabulary)

  // Built once for the whole deck rather than per card: it is the same map
  // every time, and a session can run to several hundred cards.
  const lexicon = buildLexicon(vocabulary)

  return items.flatMap((item) =>
    selection.directions.map((direction): DeckCard => {
      const key = cardKey(item.type, item.id, direction)
      return {
        key,
        item,
        direction,
        state: progress.get(key) ?? newState(now),
        note: notes.get(`${item.type}:${item.id}`) ?? null,
        stage: item.type === 'word' && item.word.kind === 'phrase' ? SENTENCE_STAGE : WORD_STAGE,
        lane: item.group,
        exampleTokens:
          item.type === 'word' && item.word.exampleThai
            ? segmentThai(item.word.exampleThai, lexicon)
            : null,
        thaiTokens:
          item.type === 'word' && item.word.kind === 'phrase'
            ? segmentThai(item.word.thai, lexicon)
            : null,
        noteTokens:
          item.type === 'word' && item.word.context
            ? segmentNote(item.word.context, lexicon)
            : null,
      }
    }),
  )
}

export function dueCards(deck: DeckCard[], now: Date): DeckCard[] {
  return deck.filter((card) => isDue(card.state, now))
}

export function leeches(deck: DeckCard[]): DeckCard[] {
  return deck.filter((card) => isLeech(card.state))
}

/**
 * Which cards are due, for the selection screen's per-group counts.
 *
 * Reads the clock here rather than in a component, so the page stays a pure
 * function of its data.
 */
export async function loadDueSnapshot(): Promise<{
  dueByKey: Record<string, boolean>
  seenKeys: string[]
}> {
  const progress = await loadProgress()
  const now = new Date()

  const dueByKey: Record<string, boolean> = {}
  for (const [key, state] of progress) {
    dueByKey[key] = isDue(state, now)
  }

  return { dueByKey, seenKeys: [...progress.keys()] }
}
