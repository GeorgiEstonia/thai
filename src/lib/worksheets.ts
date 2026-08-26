import { desc, eq, sql } from 'drizzle-orm'

import { getDb, schema } from './db'
import type { ExtractedWord } from './db/schema'
import { extractWords, isSafeToAdd, verifyItems } from './extract'
import { addWords } from './words'

/**
 * Photographed pages, read in the background.
 *
 * Pages upload one request at a time (a batch in a single request blows past
 * the body limit), then extraction and verification run detached — you can
 * close the tab the moment the last page is up.
 */

export async function createWorksheet(pack: string | null): Promise<string> {
  const [row] = await getDb()
    .insert(schema.worksheets)
    .values({ images: [], pack, status: 'uploading' })
    .returning({ id: schema.worksheets.id })
  return row.id
}

/** Appends one page. Small requests keep every upload well under the limit. */
export async function appendPage(worksheetId: string, image: string): Promise<number> {
  const [row] = await getDb()
    .update(schema.worksheets)
    .set({ images: sql`${schema.worksheets.images} || ${JSON.stringify([image])}::jsonb` })
    .where(eq(schema.worksheets.id, worksheetId))
    .returning({ images: schema.worksheets.images })
  return row?.images.length ?? 0
}

/**
 * Reads the batch, checks it, and files everything that passes.
 *
 * Runs detached — nothing awaits this — so the outcome has to be recorded on
 * the row rather than returned.
 */
export async function processWorksheet(worksheetId: string): Promise<void> {
  const db = getDb()

  try {
    const sheet = await getWorksheet(worksheetId)
    if (!sheet) return

    await db
      .update(schema.worksheets)
      .set({ status: 'extracting' })
      .where(eq(schema.worksheets.id, worksheetId))

    const extracted = await extractWords(sheet.images)

    await db
      .update(schema.worksheets)
      .set({ status: 'verifying', extracted })
      .where(eq(schema.worksheets.id, worksheetId))

    const checked = await verifyItems(extracted)

    // File what passed; hold the rest for a look.
    const safe = checked.filter(isSafeToAdd)
    if (safe.length > 0) {
      await addWords(
        safe.map((item) => ({
          thai: item.thai,
          ipa: item.ipa,
          english: item.english,
          kind: item.kind,
          notes: item.notes,
          pack: sheet.pack,
          source: 'worksheet' as const,
          worksheetId,
        })),
      )
    }

    const marked = checked.map((item) => ({ ...item, added: isSafeToAdd(item) }))
    const held = marked.filter((item) => !item.added).length

    await db
      .update(schema.worksheets)
      .set({
        status: held > 0 ? 'ready' : 'reviewed',
        extracted: marked,
        autoAdded: safe.length,
        error: null,
      })
      .where(eq(schema.worksheets.id, worksheetId))
  } catch (error) {
    await db
      .update(schema.worksheets)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Extraction failed',
      })
      .where(eq(schema.worksheets.id, worksheetId))
  }
}

export async function getWorksheet(id: string) {
  const [row] = await getDb().select().from(schema.worksheets).where(eq(schema.worksheets.id, id))
  return row ?? null
}

export async function listWorksheets() {
  return getDb()
    .select({
      id: schema.worksheets.id,
      status: schema.worksheets.status,
      createdAt: schema.worksheets.createdAt,
      extracted: schema.worksheets.extracted,
      pack: schema.worksheets.pack,
      autoAdded: schema.worksheets.autoAdded,
    })
    .from(schema.worksheets)
    .orderBy(desc(schema.worksheets.createdAt))
}

export async function markReviewed(id: string): Promise<void> {
  await getDb()
    .update(schema.worksheets)
    .set({ status: 'reviewed' })
    .where(eq(schema.worksheets.id, id))
}

export type { ExtractedWord }
