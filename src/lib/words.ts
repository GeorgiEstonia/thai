import { desc, eq } from 'drizzle-orm'

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

export async function addWords(newWords: NewWord[]): Promise<string[]> {
  if (newWords.length === 0) return []

  const rows = await getDb()
    .insert(schema.words)
    .values(
      newWords.map((word) => ({
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
