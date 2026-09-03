import { and, asc, desc, eq, sql } from 'drizzle-orm'

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
export const STALL_MS = 90 * 1000

/**
 * How long a batch may sit in "uploading" before we assume the browser that
 * was sending it is gone.
 *
 * This is deliberately far longer than STALL_MS. An upload in progress is not
 * a stalled step — it is a phone working its way through a pile of photos, and
 * nine of them take well over ninety seconds. Treating that as a stall is what
 * used to start extraction on a half-uploaded batch and silently drop the
 * pages that had not landed yet.
 */
export const UPLOAD_GRACE_MS = 15 * 60 * 1000

export async function createWorksheet(pack: string | null): Promise<string> {
  const [row] = await getDb()
    .insert(schema.worksheets)
    .values({ pack, status: 'uploading' })
    .returning({ id: schema.worksheets.id })
  return row.id
}

/** Stores one page and returns how many the batch now has. */
export async function appendPage(worksheetId: string, image: string): Promise<number> {
  const db = getDb()

  return db.transaction(async (tx) => {
    const [sheet] = await tx
      .update(schema.worksheets)
      .set({ pageCount: sql`${schema.worksheets.pageCount} + 1` })
      .where(eq(schema.worksheets.id, worksheetId))
      .returning({ pageCount: schema.worksheets.pageCount })

    const index = (sheet?.pageCount ?? 1) - 1
    await tx.insert(schema.worksheetPages).values({ worksheetId, index, image })
    return index + 1
  })
}

/**
 * Marks a batch as fully uploaded, which is what allows extraction to begin.
 *
 * Uploading is the one phase whose end only the browser knows: the server
 * cannot tell "six pages so far" from "six pages, that's all". So the client
 * says so explicitly, and until it does no step will touch the batch. Guarded
 * on the current status so a duplicate call cannot rewind a job that has
 * already moved on.
 */
export async function sealWorksheet(worksheetId: string): Promise<void> {
  await getDb()
    .update(schema.worksheets)
    .set({ status: 'extracting', stepAt: new Date() })
    .where(
      and(eq(schema.worksheets.id, worksheetId), eq(schema.worksheets.status, 'uploading')),
    )
}

/** Loads a single page — a step never needs the rest of the batch. */
async function loadPage(worksheetId: string, index: number): Promise<string | null> {
  const [row] = await getDb()
    .select({ image: schema.worksheetPages.image })
    .from(schema.worksheetPages)
    .where(
      and(
        eq(schema.worksheetPages.worksheetId, worksheetId),
        eq(schema.worksheetPages.index, index),
      ),
    )
  return row?.image ?? null
}

export async function loadPages(worksheetId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ image: schema.worksheetPages.image })
    .from(schema.worksheetPages)
    .where(eq(schema.worksheetPages.worksheetId, worksheetId))
    .orderBy(asc(schema.worksheetPages.index))
  return rows.map((row) => row.image)
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
    // Pages are still arriving. Reading the batch now would read only the ones
    // that happen to have landed, and mark the rest done without ever opening
    // them — so wait to be sealed instead.
    if (sheet.status === 'uploading') {
      return { done: true, status: 'uploading' }
    }

    const pages = sheet.pageCount
    if (pages === 0) {
      await fail(worksheetId, 'No pages were uploaded.')
      return { done: true, status: 'failed' }
    }

    // Still pages to read: do exactly one.
    if (sheet.pagesDone < pages) {
      const index = sheet.pagesDone
      const image = await loadPage(worksheetId, index)
      if (!image) {
        // The page never landed. Skip it rather than wedging the whole batch.
        await db
          .update(schema.worksheets)
          .set({ pagesDone: index + 1, stepAt: new Date() })
          .where(eq(schema.worksheets.id, worksheetId))
        return { done: false, status: 'extracting' }
      }
      const found = await extractWords([image])
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
      pageCount: schema.worksheets.pageCount,
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
      pages: sheet.pageCount,
      // A job whose step died leaves no error behind, so infer it from the
      // clock. A null stepAt means no step ever ran — which is itself a stall
      // once the job is no longer fresh, not a reason to wait forever.
      //
      // An "uploading" job is the exception: nothing is stuck, a browser is
      // still feeding it pages, and the only honest deadline is the much
      // longer one after which that browser is presumed gone.
      stalled:
        sheet.status === 'uploading'
          ? Date.now() - sheet.createdAt.getTime() > UPLOAD_GRACE_MS
          : Date.now() - (sheet.stepAt ?? sheet.createdAt).getTime() > STALL_MS,
    }))
}

/**
 * Restarts anything that has gone quiet.
 *
 * The chain is a sequence of fire-and-forget requests, and any one of them can
 * be lost — a cold start, a dropped connection, a killed function. Rather than
 * trusting every link, the app re-kicks stalled jobs whenever it checks on
 * them, which makes a lost link a delay instead of a dead import.
 */
export async function reviveStalled(
  origin: string,
  sign: (id: string) => string,
): Promise<string[]> {
  const stalled = (await activeWorksheets()).filter((job) => job.stalled)

  await Promise.all(
    stalled.map(async (job) => {
      // An upload this old was abandoned mid-flight. Seal it so the pages that
      // did land get read, rather than leaving them in limbo forever.
      if (job.status === 'uploading') await sealWorksheet(job.id)
      await fetch(`${origin}/api/worksheets/${job.id}/step?t=${sign(job.id)}`, {
        method: 'POST',
      }).catch(() => {})
    }),
  )

  return stalled.map((job) => job.id)
}

export async function markReviewed(id: string): Promise<void> {
  await getDb()
    .update(schema.worksheets)
    .set({ status: 'reviewed' })
    .where(eq(schema.worksheets.id, id))
}

export type { ExtractedWord }
