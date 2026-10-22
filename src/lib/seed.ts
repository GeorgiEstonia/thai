import { inArray } from 'drizzle-orm'

import { LESSON_SETS } from '@/content/lessons'

import { ensureSchema, getDb, schema } from './db'
import { addWords } from './words'

/**
 * Vocabulary that ships with the app, filed the first time you open it.
 *
 * There is no way to write to the deck from outside — the app is behind a
 * passphrase, as it should be — so a transcription done elsewhere has to
 * arrive as code and let the app apply it to itself. That is what this is: the
 * import runs server-side on your next visit, under your own session, with
 * nothing for you to paste.
 *
 * Applied by id, recorded when done, so it happens once however many times the
 * page is rendered. Adding already refuses anything the deck holds, so a set
 * that overlaps what you imported months ago costs nothing and changes nothing.
 */

export interface SeedResult {
  /** Sets applied on this run. */
  applied: { id: string; pack: string; added: number; alreadyHad: number }[]
  /** Items filed across those sets. */
  added: number
}

async function appliedIds(): Promise<Set<string>> {
  const rows = await getDb().select({ id: schema.seedImports.id }).from(schema.seedImports)
  return new Set(rows.map((row) => row.id))
}

/** Sets still to apply, in order. */
export async function pendingSeeds() {
  await ensureSchema()
  const done = await appliedIds()
  return LESSON_SETS.filter((set) => !done.has(set.id))
}

export async function applyPendingSeeds(): Promise<SeedResult> {
  const pending = await pendingSeeds()
  const applied: SeedResult['applied'] = []
  let added = 0

  for (const set of pending) {
    const ids = await addWords(
      set.items.map((item) => ({ ...item, pack: set.pack, source: 'worksheet' as const })),
    )

    // Recorded even when every item was already there: the set has been dealt
    // with, and re-running it would only ask the same question again.
    await getDb()
      .insert(schema.seedImports)
      .values({ id: set.id, items: set.items.length, added: ids.length })
      .onConflictDoNothing()

    applied.push({
      id: set.id,
      pack: set.pack,
      added: ids.length,
      alreadyHad: set.items.length - ids.length,
    })
    added += ids.length
  }

  return { applied, added }
}

/** Undoes a set, for a transcription that turns out to be wrong. */
export async function forgetSeed(id: string): Promise<void> {
  await ensureSchema()
  await getDb().delete(schema.seedImports).where(inArray(schema.seedImports.id, [id]))
}
