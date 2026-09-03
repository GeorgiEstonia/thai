import {
  DIRECTIONS,
  type Direction,
  PRACTICE_ITEMS,
  type PracticeItem,
  WORDS_GROUP,
  cardKey,
} from '@/content/items'

import { getDb, schema } from './db'
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
async function applyVocabRules(
  items: PracticeItem[],
  selection: Selection,
  progress: Map<string, SrsState>,
): Promise<PracticeItem[]> {
  const hasVocab = items.some((item) => item.type === 'word')
  if (!hasVocab) return items

  const vocabulary = await listWords()
  const learned = learnedWords(vocabulary, progress)

  return items.filter((item) => {
    if (item.type !== 'word') return true
    if (selection.kind && item.word.kind !== selection.kind) return false
    if (item.word.kind !== 'phrase') return true
    return gateFor(item.word, vocabulary, learned).unlocked
  })
}

/** Every card (item × direction) implied by a selection, with its schedule. */
export async function loadDeck(selection: Selection, now: Date): Promise<DeckCard[]> {
  const [progress, allItems, notes] = await Promise.all([
    loadProgress(),
    selectedItems(selection),
    loadNotes(),
  ])

  const items = await applyVocabRules(allItems, selection, progress)

  return items.flatMap((item) =>
    selection.directions.map((direction): DeckCard => {
      const key = cardKey(item.type, item.id, direction)
      return {
        key,
        item,
        direction,
        state: progress.get(key) ?? newState(now),
        note: notes.get(`${item.type}:${item.id}`) ?? null,
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
