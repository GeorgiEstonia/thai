import { sql as raw } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

/**
 * The connection is opened on first use, not at import time — a build (or a
 * unit test) that merely imports a page must not require a live database.
 *
 * The pool is cached on globalThis so Next's dev-mode module reloading doesn't
 * open a fresh one on every edit and exhaust Postgres.
 */

type Db = ReturnType<typeof drizzle<typeof schema>>

const globalForDb = globalThis as unknown as {
  thaiSql?: ReturnType<typeof postgres>
  thaiDb?: Db
}

/**
 * Set by integration tests to point the real write path at an in-process
 * Postgres. Never set in application code.
 */
let testDb: Db | null = null

export function __setTestDb(db: Db | null): void {
  testDb = db
  schemaReady = null
}

/**
 * Columns added after the production database was created, applied by the app.
 *
 * This exists because there is no way to run a migration against the hosted
 * database from here — and shipping code that selects a column the database
 * does not have takes every screen down, which has happened once already. Each
 * statement is additive and idempotent, so running it repeatedly costs one
 * round trip and changes nothing.
 *
 * Adding a column here is not a substitute for the migration in drizzle/ —
 * that stays the source of truth, and is what the tests apply.
 */
const ADDITIVE_COLUMNS = [
  `alter table "words" add column if not exists "example_thai" text`,
  `alter table "words" add column if not exists "example_ipa" text`,
  `alter table "words" add column if not exists "example_english" text`,
  `alter table "words" add column if not exists "context" text`,
  `alter table "words" add column if not exists "priority" integer default 0 not null`,
]

let schemaReady: Promise<void> | null = null

/**
 * Makes sure the columns the code expects exist before anything reads them.
 *
 * Memoised, so it is one round trip per server process rather than per query.
 * A failure is not cached: a database that was briefly unreachable should be
 * retried rather than leaving the process convinced the schema is missing.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const db = getDb()
    schemaReady = (async () => {
      for (const statement of ADDITIVE_COLUMNS) {
        await db.execute(raw.raw(statement))
      }
    })().catch((error) => {
      schemaReady = null
      throw error
    })
  }
  return schemaReady
}

export function getDb(): Db {
  if (testDb) return testDb
  if (globalForDb.thaiDb) return globalForDb.thaiDb

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set — copy .env.example to .env.local and fill it in')
  }

  // Hosted Postgres (Railway, Neon, Supabase) requires TLS on its public
  // endpoint, and postgres.js does not enable it from the URL alone — without
  // this, every query fails in production while working locally. The local dev
  // database speaks plain TCP, so it must stay off there.
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url)

  // One connection, deliberately. This app has a single user, so there is no
  // concurrency to win — and the local dev database (PGlite behind a socket)
  // serves one connection at a time, so a larger pool turns any concurrent
  // query into ECONNRESET. Serverless instances each get their own.
  const sql =
    globalForDb.thaiSql ?? postgres(url, { max: 1, ssl: isLocal ? false : 'require' })
  const db = drizzle(sql, { schema })

  if (process.env.NODE_ENV !== 'production') {
    globalForDb.thaiSql = sql
    globalForDb.thaiDb = db
  }

  return db
}

export { schema }

/**
 * Exposed for tests: hosted databases need TLS, the local dev one must not
 * have it. Getting this wrong fails only in production, so it is worth
 * pinning down.
 */
export function needsTls(url: string): boolean {
  return !/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url)
}
