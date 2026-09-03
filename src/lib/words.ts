import { and, desc, eq, inArray } from 'drizzle-orm'

import { type ItemType, type WordRecord, wordItem } from '@/content/items'

import { getDb, schema } from './db'

/** Vocabulary: the part of the deck that is yours rather than authored. */

export async function listWords(): Promise<WordRecord[]> {
  const rows = await getDb().select().from(schema.words).orderBy(desc(schema.words.createdAt))
  return rows.map((row) => ({
    id: row.id,
    thai: row.thai,
    ipa: row.ipa,
    english: row.english,
    kind: row.kind,
    pack: row.pack,
    notes: row.notes,
  }))
}

export async function listWordItems() {
  return (await listWords()).map(wordItem)
}

export interface NewWord {
  thai: string
  ipa: string
  english: string
  kind?: 'word' | 'phrase'
  pack?: string | null
  notes?: string | null
  source: 'manual' | 'worksheet'
  worksheetId?: string | null
}

/** A word is the same word if it is written the same way and is the same kind. */
function identity(thai: string, kind: 'word' | 'phrase'): string {
  return `${kind}:${thai.trim()}`
}

/**
 * Adds only what the deck does not already have.
 *
 * Extraction deduplicates within a batch, but nothing used to check a batch
 * against the deck — so every import re-added the vocabulary the last import
 * had already filed, and a handful of lessons became a deck too big to get
 * through once. Textbook chapters repeat their core words constantly, which is
 * exactly the vocabulary you most want a single card for.
 */
export async function addWords(newWords: NewWord[]): Promise<string[]> {
  if (newWords.length === 0) return []

  const existing = new Set((await listWords()).map((word) => identity(word.thai, word.kind)))

  // Also guards against a batch that repeats itself, so the caller does not
  // have to have deduplicated first.
  const seen = new Set<string>()
  const fresh = newWords.filter((word) => {
    const key = identity(word.thai, word.kind ?? 'word')
    if (existing.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (fresh.length === 0) return []

  const rows = await getDb()
    .insert(schema.words)
    .values(
      fresh.map((word) => ({
        thai: word.thai.trim(),
        ipa: word.ipa.trim(),
        english: word.english.trim(),
        kind: word.kind ?? 'word',
        pack: word.pack?.trim() || null,
        notes: word.notes?.trim() || null,
        source: word.source,
        worksheetId: word.worksheetId ?? null,
      })),
    )
    .returning({ id: schema.words.id })

  return rows.map((row) => row.id)
}

/**
 * Removes vocabulary the deck holds more than once.
 *
 * Keeps the copy you have actually practised — the one carrying a schedule,
 * and among those the one furthest along — so tidying up never costs progress.
 * Failing that it keeps the oldest, which is the one most likely to be filed
 * under the pack you remember putting it in.
 */
export async function removeDuplicateWords(): Promise<{ removed: number; kept: number }> {
  const db = getDb()

  const rows = await db
    .select({
      id: schema.words.id,
      thai: schema.words.thai,
      kind: schema.words.kind,
      createdAt: schema.words.createdAt,
    })
    .from(schema.words)
    .orderBy(desc(schema.words.createdAt))

  const progress = await db
    .select({ itemId: schema.itemProgress.itemId, reps: schema.itemProgress.reps })
    .from(schema.itemProgress)
    .where(eq(schema.itemProgress.itemType, 'word'))

  const repsById = new Map<string, number>()
  for (const row of progress) {
    repsById.set(row.itemId, (repsById.get(row.itemId) ?? 0) + row.reps)
  }

  const groups = new Map<string, typeof rows>()
  for (const row of rows) {
    const key = identity(row.thai, row.kind)
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  const doomed: string[] = []
  for (const group of groups.values()) {
    if (group.length < 2) continue

    const [keep] = [...group].sort((a, b) => {
      const reps = (repsById.get(b.id) ?? 0) - (repsById.get(a.id) ?? 0)
      if (reps !== 0) return reps
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    for (const row of group) if (row.id !== keep.id) doomed.push(row.id)
  }

  if (doomed.length === 0) return { removed: 0, kept: groups.size }

  // In batches: a delete with two thousand bound parameters is asking for
  // trouble on a hosted database.
  for (let start = 0; start < doomed.length; start += 200) {
    const slice = doomed.slice(start, start + 200)
    await db.delete(schema.words).where(inArray(schema.words.id, slice))
    await db
      .delete(schema.itemProgress)
      .where(
        and(eq(schema.itemProgress.itemType, 'word'), inArray(schema.itemProgress.itemId, slice)),
      )
    await db
      .delete(schema.itemNotes)
      .where(and(eq(schema.itemNotes.itemType, 'word'), inArray(schema.itemNotes.itemId, slice)))
  }

  return { removed: doomed.length, kept: groups.size }
}

/** How many rows the deck holds more than once, without changing anything. */
export async function countDuplicateWords(): Promise<number> {
  const words = await listWords()
  const seen = new Set<string>()
  let duplicates = 0
  for (const word of words) {
    const key = identity(word.thai, word.kind)
    if (seen.has(key)) duplicates++
    else seen.add(key)
  }
  return duplicates
}

/** Distinct pack names, for the selection screen and the add form. */
export async function listPacks(): Promise<string[]> {
  const words = await listWords()
  const packs = new Set<string>()
  for (const word of words) if (word.pack) packs.add(word.pack)
  return [...packs].sort()
}

export async function updateWord(
  id: string,
  patch: { thai: string; ipa: string; english: string; notes: string | null; pack: string | null },
): Promise<void> {
  await getDb()
    .update(schema.words)
    .set({
      thai: patch.thai.trim(),
      ipa: patch.ipa.trim(),
      english: patch.english.trim(),
      notes: patch.notes?.trim() || null,
      pack: patch.pack?.trim() || null,
    })
    .where(eq(schema.words.id, id))
}

export async function deleteWord(id: string): Promise<void> {
  await getDb().delete(schema.words).where(eq(schema.words.id, id))
}

// ---------------------------------------------------------------------------
// Personal mnemonics — for words, characters and vowels alike
// ---------------------------------------------------------------------------

export async function loadNotes(): Promise<Map<string, string>> {
  const rows = await getDb().select().from(schema.itemNotes)
  return new Map(rows.map((row) => [`${row.itemType}:${row.itemId}`, row.mnemonic]))
}

export async function saveNote(
  itemType: ItemType,
  itemId: string,
  mnemonic: string,
): Promise<void> {
  const trimmed = mnemonic.trim()
  const db = getDb()

  if (trimmed === '') {
    await db
      .delete(schema.itemNotes)
      .where(eq(schema.itemNotes.itemId, itemId))
    return
  }

  await db
    .insert(schema.itemNotes)
    .values({ itemType, itemId, mnemonic: trimmed, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [schema.itemNotes.itemType, schema.itemNotes.itemId],
      set: { mnemonic: trimmed, updatedAt: new Date() },
    })
}
