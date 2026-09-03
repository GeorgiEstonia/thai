import { and, eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { getDb, schema } from '@/lib/db'

/**
 * Says what is actually broken, without a log viewer.
 *
 * Deliberately unauthenticated — the auth check itself needs config, so an
 * endpoint that required it would be useless exactly when it is needed. It
 * therefore reports only whether things are configured and reachable, never
 * any value, and scrubs credentials out of driver errors before returning
 * them.
 */
export const dynamic = 'force-dynamic'

/** Postgres errors happily quote the whole connection string back at you. */
function redact(message: string): string {
  return message
    .replace(/postgres(ql)?:\/\/[^\s"']+/gi, 'postgres://[redacted]')
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, 'sk-ant-[redacted]')
    .slice(0, 300)
}

/** Unwraps the driver error a wrapper is hiding, which is where the real
 *  reason ("no pg_hba entry", "relation does not exist") always lives. */
function explain(error: unknown): string {
  const chain: string[] = []
  let current: unknown = error
  for (let depth = 0; current instanceof Error && depth < 4; depth++) {
    const code = (current as Error & { code?: string }).code
    chain.push(`${current.message}${code ? ` [${code}]` : ''}`)
    current = (current as Error & { cause?: unknown }).cause
  }
  return redact(chain.join(' <- '))
}

/**
 * Does a write actually go through?
 *
 * Reading works over a plain query; grading a card needs a transaction, an
 * upsert and an append, and those can fail on their own. A read-only health
 * check calls that healthy, which is exactly how "the answer did not save"
 * stayed invisible. So the probe runs the real transaction against a reserved
 * sentinel row and then removes it.
 */
async function probeWrite() {
  const db = getDb()
  const ID = '__health_probe__'
  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(schema.itemProgress)
        .values({ itemType: 'character', itemId: ID, direction: 'recognise', intervalDays: 1 })
        .onConflictDoUpdate({
          target: [
            schema.itemProgress.itemType,
            schema.itemProgress.itemId,
            schema.itemProgress.direction,
          ],
          set: { intervalDays: 1 },
        })
      await tx.insert(schema.reviewLog).values({
        itemType: 'character',
        itemId: ID,
        direction: 'recognise',
        grade: 'got',
        intervalBefore: 0,
        intervalAfter: 1,
      })
    })
    await db.delete(schema.reviewLog).where(eq(schema.reviewLog.itemId, ID))
    await db
      .delete(schema.itemProgress)
      .where(
        and(eq(schema.itemProgress.itemType, 'character'), eq(schema.itemProgress.itemId, ID)),
      )
    return { ok: true }
  } catch (error) {
    return { ok: false, error: explain(error) }
  }
}

/**
 * How big the deck actually is, and how much of it is the same word twice.
 *
 * Counts only, never content: this endpoint is unauthenticated on purpose and
 * has no business handing out someone's vocabulary.
 */
async function deckStats() {
  const db = getDb()
  const rows = await db
    .select({ thai: schema.words.thai, kind: schema.words.kind })
    .from(schema.words)

  const distinct = { word: new Set<string>(), phrase: new Set<string>() }
  const total = { word: 0, phrase: 0 }

  for (const row of rows) {
    total[row.kind]++
    distinct[row.kind].add(row.thai.trim())
  }

  return {
    rows: rows.length,
    words: total.word,
    phrases: total.phrase,
    distinctWords: distinct.word.size,
    distinctPhrases: distinct.phrase.size,
    duplicateRows:
      total.word - distinct.word.size + (total.phrase - distinct.phrase.size),
  }
}

export async function GET(request: Request) {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    APP_PASSPHRASE: Boolean(process.env.APP_PASSPHRASE),
    SESSION_SECRET: Boolean(process.env.SESSION_SECRET),
    ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
  }

  let database: { ok: boolean; error?: string; tables?: number; words?: number } = { ok: false }

  try {
    const db = getDb()
    // Does the schema actually exist? A reachable but empty database is the
    // most likely failure after a deploy — db:push run against the wrong URL.
    const tables = await db.execute<{ count: number }>(
      sql`select count(*)::int as count from information_schema.tables where table_schema = 'public'`,
    )
    const words = await db.select({ id: schema.words.id }).from(schema.words).limit(1)

    database = {
      ok: true,
      tables: Number((tables as unknown as { count: number }[])[0]?.count ?? 0),
      words: words.length,
    }
  } catch (error) {
    // Drizzle wraps driver errors, so the useful part ("no pg_hba entry",
    // "self signed certificate", "relation does not exist") is in the cause.
    database = { ok: false, error: explain(error) }
  }

  const params = new URL(request.url).searchParams
  const write = params.get('probe') === 'write' ? await probeWrite() : undefined
  const deck = database.ok && params.get('deck') === '1' ? await deckStats() : undefined

  return NextResponse.json(
    {
      env,
      database,
      write,
      deck,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    },
    { status: database.ok && Object.values(env).every(Boolean) ? 200 : 503 },
  )
}
