import { desc, eq, sql } from 'drizzle-orm'

import { getDb, schema } from './db'
import type { ExtractedWord } from './db/schema'
import {
  composePhrases,
  dedupe,
  extractWords,
  isSafeToAdd,
  sortForReview,
  verifyItems,
} from './extract'
import { addWords } from './words'

/**
 * Photographed pages, read one page per request.
 *
 * A whole batch in one invocation runs past the serverless function timeout
 * and is killed with nothing recorded, so a job would sit in "extracting"
 * forever. Each step now reads a single page, saves what it found, and hands
 * off to the next — so no request is ever long, and progress survives a
 * killed function.
 */

/** A step is considered dead if it has made no progress in this long. */
export const STALL_MS = 3 * 60 * 1000

export async function createWorksheet(pack: string | null): Promise<string> {
  const [row] = await getDb()
    .insert(schema.worksheets)
    .values({ images: [], pack, status: 'uploading' })
    .returning({ id: schema.worksheets.id })
  return row.id
}

export async function appendPage(worksheetId: string, image: string): Promise<number> {
  const [row] = await getDb()
    .update(schema.worksheets)
    .set({ images: sql`${schema.worksheets.images} || ${JSON.stringify([image])}::jsonb` })
    .where(eq(schema.worksheets.id, worksheetId))
    .returning({ images: schema.worksheets.images })
  return row?.images.length ?? 0
}

export type StepResult = { done: boolean; status: string }

/**
 * Does the next unit of work and returns whether more remains.
 *
 * Never throws for expected failures — the outcome goes on the row, because
 * the caller is a fire-and-forget request nobody is reading the response of.
 */
export async function runStep(worksheetId: string): Promise<StepResult> {
  const db = getDb()

  try {
    const sheet = await getWorksheet(worksheetId)
    if (!sheet) return { done: true, status: 'missing' }
    if (sheet.status === 'ready' || sheet.status === 'reviewed' || sheet.status === 'failed') {
      return { done: true, status: sheet.status }
    }

    const pages = sheet.images.length
    if (pages === 0) {
      await fail(worksheetId, 'No pages were uploaded.')
      return { done: true, status: 'failed' }
    }

    // Still pages to read: do exactly one.
    if (sheet.pagesDone < pages) {
      const index = sheet.pagesDone
      const found = await extractWords([sheet.images[index]])
      const merged = dedupe([...(sheet.extracted ?? []), ...found])

      await db
        .update(schema.worksheets)
        .set({
          status: 'extracting',
          extracted: merged,
          pagesDone: index + 1,
          stepAt: new Date(),
          error: null,
        })
        .where(eq(schema.worksheets.id, worksheetId))

      return { done: false, status: 'extracting' }
    }

    // All pages read. Write a few sentences that put the new words to work,
    // then check everything before it is filed. Sentences are composed rather
    // than transcribed: a chapter's worth of textbook dialogue buries the
    // vocabulary, and a handful of patterns is what actually gets practised.
    await db
      .update(schema.worksheets)
      .set({ status: 'verifying', stepAt: new Date() })
      .where(eq(schema.worksheets.id, worksheetId))

    const words = (sheet.extracted ?? []).filter((item) => item.kind === 'word')
    const phrases = await composePhrases(words)
    const checked = await verifyItems(sortForReview([...words, ...phrases]))
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
        stepAt: new Date(),
        error: null,
      })
      .where(eq(schema.worksheets.id, worksheetId))

    return { done: true, status: held > 0 ? 'ready' : 'reviewed' }
  } catch (error) {
    await fail(worksheetId, error instanceof Error ? error.message : 'Extraction failed')
    return { done: true, status: 'failed' }
  }
}

async function fail(worksheetId: string, message: string): Promise<void> {
  await getDb()
    .update(schema.worksheets)
    .set({ status: 'failed', error: message.slice(0, 300), stepAt: new Date() })
    .where(eq(schema.worksheets.id, worksheetId))
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
      pagesDone: schema.worksheets.pagesDone,
      images: schema.worksheets.images,
      stepAt: schema.worksheets.stepAt,
      error: schema.worksheets.error,
    })
    .from(schema.worksheets)
    .orderBy(desc(schema.worksheets.createdAt))
}

/** Jobs still working, for the running-in-the-background indicator. */
export async function activeWorksheets() {
  const all = await listWorksheets()
  return all
    .filter((sheet) => ['uploading', 'extracting', 'verifying'].includes(sheet.status))
    .map((sheet) => ({
      id: sheet.id,
      status: sheet.status,
      pagesDone: sheet.pagesDone,
      pages: sheet.images.length,
      // A job whose step died leaves no error behind, so infer it from the
      // clock. A null stepAt means no step ever ran — which is itself a stall
      // once the job is no longer fresh, not a reason to wait forever.
      stalled: Date.now() - (sheet.stepAt ?? sheet.createdAt).getTime() > STALL_MS,
    }))
}

export async function markReviewed(id: string): Promise<void> {
  await getDb()
    .update(schema.worksheets)
    .set({ status: 'reviewed' })
    .where(eq(schema.worksheets.id, id))
}

export type { ExtractedWord }
