import { desc, eq } from 'drizzle-orm'

import { getDb, schema } from './db'
import type { ExtractedWord } from './db/schema'
import { extractWords } from './extract'

export async function createWorksheet(images: string[], pack: string | null): Promise<string> {
  const [row] = await getDb()
    .insert(schema.worksheets)
    .values({ images, pack, status: 'extracting' })
    .returning({ id: schema.worksheets.id })
  return row.id
}

/** Runs extraction and records the outcome, success or failure. */
export async function runExtraction(worksheetId: string, images: string[]): Promise<void> {
  const db = getDb()
  try {
    const words = await extractWords(images)
    await db
      .update(schema.worksheets)
      .set({ status: 'ready', extracted: words, error: null })
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
