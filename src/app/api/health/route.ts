import { and, eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { ensureSchema, getDb, schema } from '@/lib/db'
import { DESCRIBE_VERSION } from '@/lib/extract'
import { loadProgress } from '@/lib/practice'
import { bareThaiRuns } from '@/lib/romanised'
import { learnedWords, partitionPhrases } from '@/lib/unlock'
import { listWords } from '@/lib/words'

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
/**
 * What is missing from the deck, and what the phrase gate is doing.
 *
 * Counts only — no vocabulary, so this says how much work there is without
 * putting the deck itself on a public URL. "Some words have no example, a lot
 * of nouns have no classifier, I only ever see one sentence" are three
 * questions about scale, and guessing at them is how you end up fixing the
 * wrong one.
 */
/**
 * TEMPORARY. The vocabulary that still needs an example, a classifier or a
 * readable note — spelling, gloss and kind, and nothing else.
 *
 * Here because the content is being rewritten by hand this session rather than
 * by the paid describe pipeline, and the deck cannot be read from outside the
 * app any other way. Delete this and its parameter once that is done; it is
 * not a feature, and nothing in the app calls it.
 */
async function itemsNeedingWork() {
  await ensureSchema()
  const words = await listWords()

  return words
    .filter(
      (w) =>
        !w.exampleThai ||
        bareThaiRuns(w.context).length > 0 ||
        bareThaiRuns(w.classifier).length > 0 ||
        (w.describeVersion ?? 0) < DESCRIBE_VERSION,
    )
    .map((w) => ({
      t: w.thai,
      e: w.english,
      k: w.kind === 'phrase' ? 'p' : 'w',
      // What it is short of, so the rewrite can be aimed.
      need: [
        !w.exampleThai ? 'ex' : null,
        !w.classifier?.trim() ? 'clf' : null,
        bareThaiRuns(w.context).length > 0 ? 'bare' : null,
      ]
        .filter(Boolean)
        .join(','),
    }))
}

async function contentAudit() {
  await ensureSchema()

  const words = await listWords()
  const progress = await loadProgress()

  const unreadable = (text: string | null | undefined) => bareThaiRuns(text).length > 0

  const missingExample = words.filter((w) => !w.exampleThai).length
  const missingExampleReading = words.filter((w) => w.exampleThai && !w.exampleIpa).length
  const missingExampleEnglish = words.filter((w) => w.exampleThai && !w.exampleEnglish).length
  const bareNote = words.filter((w) => unreadable(w.context)).length
  const bareClassifier = words.filter((w) => unreadable(w.classifier)).length
  const missingReading = words.filter((w) => !w.ipa?.trim()).length
  const missingEnglish = words.filter((w) => !w.english?.trim()).length
  const noClassifier = words.filter((w) => w.kind === 'word' && !w.classifier?.trim()).length
  const noPack = words.filter((w) => !w.pack).length
  const staleVersion = words.filter((w) => (w.describeVersion ?? 0) < DESCRIBE_VERSION).length

  // The phrase gate: why only one sentence ever shows up.
  const { ready, locked } = partitionPhrases(words, progress)
  const blockedCounts = locked.map((entry) => entry.blockedBy.length)
  const learned = learnedWords(words, progress)

  return {
    words: words.length,
    describeVersion: DESCRIBE_VERSION,
    missing: {
      example: missingExample,
      exampleReading: missingExampleReading,
      exampleEnglish: missingExampleEnglish,
      reading: missingReading,
      english: missingEnglish,
      classifier: noClassifier,
      pack: noPack,
    },
    unreadable: { note: bareNote, classifier: bareClassifier },
    staleVersion,
    phrases: {
      total: words.filter((w) => w.kind === 'phrase').length,
      ready: ready.length,
      locked: locked.length,
      // How many words a locked phrase is still waiting on. If this is mostly
      // 3+, the gate is the reason the sentences never appear.
      blockedByHistogram: blockedCounts.reduce<Record<string, number>>((acc, n) => {
        const key = n >= 5 ? '5+' : String(n)
        acc[key] = (acc[key] ?? 0) + 1
        return acc
      }, {}),
    },
    study: {
      wordsRecalledOnce: learned.size,
      cardsScheduled: progress.size,
    },
  }
}

async function deckStats() {
  // Applies any columns and tables the running code expects. Doing it here
  // means the health check reports the schema the app will actually use,
  // rather than whatever state it happened to be left in — and confirms the
  // step works at all, which is otherwise only observable by signing in.
  await ensureSchema()

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

/**
 * Which packs exist and when each was last added to.
 *
 * Names and dates only — the pack label is something you chose ("Chapter 3"),
 * not vocabulary. This endpoint is unauthenticated on purpose and has no
 * business handing out the contents of a deck.
 */
async function packSummary() {
  const rows = await getDb()
    .select({
      pack: schema.words.pack,
      createdAt: schema.words.createdAt,
      kind: schema.words.kind,
    })
    .from(schema.words)

  const packs = new Map<string, { words: number; phrases: number; last: Date; first: Date }>()
  for (const row of rows) {
    const key = row.pack ?? '(ungrouped)'
    const entry = packs.get(key) ?? {
      words: 0,
      phrases: 0,
      last: row.createdAt,
      first: row.createdAt,
    }
    if (row.kind === 'phrase') entry.phrases++
    else entry.words++
    if (row.createdAt > entry.last) entry.last = row.createdAt
    if (row.createdAt < entry.first) entry.first = row.createdAt
    packs.set(key, entry)
  }

  return [...packs.entries()]
    .map(([pack, value]) => ({
      pack,
      words: value.words,
      phrases: value.phrases,
      firstAdded: value.first.toISOString().slice(0, 10),
      lastAdded: value.last.toISOString().slice(0, 10),
    }))
    .sort((a, b) => b.lastAdded.localeCompare(a.lastAdded))
}

export async function GET(request: Request) {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    APP_PASSPHRASE: Boolean(process.env.APP_PASSPHRASE),
    SESSION_SECRET: Boolean(process.env.SESSION_SECRET),
    ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
  }

  let database: {
    ok: boolean
    error?: string
    tables?: number
    words?: number
    pingMs?: number
    region?: string
  } = { ok: false }

  try {
    const db = getDb()

    // How far the database actually is from the function, which is otherwise
    // guesswork. A co-located pair answers this in single digits; a hundred
    // milliseconds and up means they are in different parts of the world and
    // every round trip on every page is paying for the distance.
    const pingStart = performance.now()
    await db.execute(sql`select 1`)
    const pingMs = Math.round(performance.now() - pingStart)
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
      pingMs,
      // Where this function ran, so the ping has a second end to it.
      region: process.env.VERCEL_REGION,
    }
  } catch (error) {
    // Drizzle wraps driver errors, so the useful part ("no pg_hba entry",
    // "self signed certificate", "relation does not exist") is in the cause.
    database = { ok: false, error: explain(error) }
  }

  const params = new URL(request.url).searchParams
  const write = params.get('probe') === 'write' ? await probeWrite() : undefined
  const deck = database.ok && params.get('deck') === '1' ? await deckStats() : undefined
  const packs = database.ok && params.get('packs') === '1' ? await packSummary() : undefined
  const audit = database.ok && params.get('audit') === '1' ? await contentAudit() : undefined
  const items = database.ok && params.get('items') === '1' ? await itemsNeedingWork() : undefined

  return NextResponse.json(
    {
      env,
      database,
      write,
      deck,
      packs,
      audit,
      items,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      // The commit above is baked in when the bundle is built, so a cached
      // build can report an old one while running current code — which is
      // exactly how a deploy came to look stuck when it was not. The
      // deployment id is read at request time and changes every release, so
      // it is the honest answer to "is this the version I just pushed".
      deployment: process.env.VERCEL_DEPLOYMENT_ID ?? 'local',
    },
    { status: database.ok && Object.values(env).every(Boolean) ? 200 : 503 },
  )
}
