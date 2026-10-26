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
  `create table if not exists "seed_imports" (
     "id" text primary key,
     "items" integer default 0 not null,
     "added" integer default 0 not null,
     "applied_at" timestamp with time zone default now() not null
   )`,
  `create table if not exists "api_usage" (
     "id" bigserial primary key,
     "at" timestamp with time zone default now() not null,
     "operation" text not null,
     "model" text not null,
     "input_tokens" integer default 0 not null,
     "output_tokens" integer default 0 not null,
     "cache_read_tokens" integer default 0 not null,
     "cache_write_tokens" integer default 0 not null,
     "cost_micros" integer default 0 not null
   )`,
  `create table if not exists "job_leases" (
     "id" text primary key,
     "held_at" timestamp with time zone default now() not null
   )`,
  `alter table "words" add column if not exists "example_thai" text`,
  `alter table "words" add column if not exists "example_ipa" text`,
  `alter table "words" add column if not exists "example_english" text`,
  `alter table "words" add column if not exists "context" text`,
  `alter table "words" add column if not exists "classifier" text`,
  `alter table "words" add column if not exists "describe_version" integer default 0 not null`,
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
      // One round trip, not one per statement. These run before the first
      // query of every cold instance, so eleven sequential round trips to a
      // hosted database put a second or more in front of the first page load.
      //
      // Wrapped in a DO block rather than simply joined with semicolons: the
      // driver sends this over the extended query protocol, which carries one
      // statement per message and rejects a joined list outright. A DO block
      // is one statement that happens to contain eleven.
      await db.execute(raw.raw(`do $$ begin\n${ADDITIVE_COLUMNS.join(';\n')};\nend $$;`))
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

  // The local dev database (PGlite behind a socket) serves one connection at a
  // time, so a larger pool there turns any concurrent query into ECONNRESET.
  // A hosted one is happy to parallelise, and a page that asks four questions
  // at once should not have to ask them one after another.
  const sql =
    globalForDb.thaiSql ??
    postgres(url, {
      max: isLocal ? 1 : 3,
      ssl: isLocal ? false : 'require',
      // Let an idle connection go, so instances that have scaled out and gone
      // quiet stop holding slots the live one needs.
      idle_timeout: 20,
    })
  const db = drizzle(sql, { schema })

  // Cached in production too, which it once was not.
  //
  // The reasoning was that each serverless instance gets its own pool anyway,
  // so caching only mattered for dev-mode module reloading. But the pool was
  // then rebuilt on *every getDb() call* — and a page that loads words, packs,
  // duplicates and progress together makes several. Each one opened a fresh
  // connection and a fresh TLS handshake to the hosted database, and never
  // closed it: the settings page cost seven, which read as "nothing happens"
  // once the total ran past the platform's function timeout, and locally, on a
  // database that permits one connection, failed outright.
  //
  // An instance is a process and should hold one pool for its lifetime. That
  // is what globalThis is for here, in every environment.
  globalForDb.thaiSql = sql
  globalForDb.thaiDb = db

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
