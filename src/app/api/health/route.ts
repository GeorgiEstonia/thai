import { sql } from 'drizzle-orm'
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

export async function GET() {
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
    database = {
      ok: false,
      error: redact(error instanceof Error ? error.message : String(error)),
    }
  }

  return NextResponse.json(
    { env, database, commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local' },
    { status: database.ok && Object.values(env).every(Boolean) ? 200 : 503 },
  )
}
