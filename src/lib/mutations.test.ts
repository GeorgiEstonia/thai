import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { __setTestDb, getDb, schema } from './db'
import { recordReview } from './mutations'
import { addDays, applyGrade, newState } from './srs'

/**
 * Integration test for the write path, against a real Postgres running
 * in-process (PGlite). This is what catches the class of bug unit tests
 * can't: a schema that doesn't apply, an upsert that inserts a duplicate
 * instead of updating, a transaction that half-commits.
 */

const client = new PGlite()
const db = drizzle(client, { schema })

// PGlite's drizzle instance is a different concrete type to the postgres-js
// one the app uses; both implement the same query builder surface.
__setTestDb(db as unknown as ReturnType<typeof getDb>)

const NOW = new Date('2026-08-14T09:00:00.000Z')
const DIRECTION = 'recognise' as const

/**
 * Applies the checked-in migrations rather than hand-written DDL, so this test
 * fails if the schema and the migrations ever drift apart.
 */
function migrationSql(): string {
  const dir = path.resolve(process.cwd(), 'drizzle')
  return readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(path.join(dir, file), 'utf8'))
    .join('\n')
}

beforeAll(async () => {
  // PGlite's exec() takes multiple statements; drizzle's execute() prepares a
  // single one and rejects a whole migration file.
  await client.exec(migrationSql())
})

beforeEach(async () => {
  await client.exec('truncate item_progress, review_log, item_notes, words, worksheets')
})

afterAll(async () => {
  __setTestDb(null)
  await client.close()
})

async function progressFor(charId: string) {
  const rows = await db.select().from(schema.itemProgress)
  return rows.find((row) => row.itemId === charId)
}

describe('recordReview', () => {
  it('creates a schedule row the first time a character is graded', async () => {
    const before = newState(NOW)
    const after = applyGrade(before, 'got', NOW)

    await recordReview({
      itemType: 'character',
      direction: DIRECTION,
      itemId: 'ko-kai',
      grade: 'got',
      scheduling: { before, after },
      intervalAtShowing: 0,
      reviewedAt: NOW,
    })

    const row = await progressFor('ko-kai')
    expect(row?.intervalDays).toBe(1)
    expect(row?.reps).toBe(1)
    expect(row?.dueAt).toEqual(addDays(NOW, 1))
  })

  it('updates the existing row rather than inserting a second one', async () => {
    const first = applyGrade(newState(NOW), 'got', NOW)
    await recordReview({
      itemType: 'character',
      direction: DIRECTION,
      itemId: 'ko-kai',
      grade: 'got',
      scheduling: { before: newState(NOW), after: first },
      intervalAtShowing: 0,
      reviewedAt: NOW,
    })

    const second = applyGrade(first, 'got', NOW)
    await recordReview({
      itemType: 'character',
      direction: DIRECTION,
      itemId: 'ko-kai',
      grade: 'got',
      scheduling: { before: first, after: second },
      intervalAtShowing: first.intervalDays,
      reviewedAt: NOW,
    })

    const rows = await db.select().from(schema.itemProgress)
    expect(rows).toHaveLength(1)
    expect(rows[0].intervalDays).toBe(2)
    expect(rows[0].reps).toBe(2)
  })

  it('records a lapse and resets the interval on a miss', async () => {
    const grown = { intervalDays: 16, dueAt: NOW, reps: 5, lapses: 0 }
    await recordReview({
      itemType: 'character',
      direction: DIRECTION,
      itemId: 'so-suea',
      grade: 'got',
      scheduling: { before: newState(NOW), after: grown },
      intervalAtShowing: 0,
      reviewedAt: NOW,
    })

    const missed = applyGrade(grown, 'missed', NOW)
    await recordReview({
      itemType: 'character',
      direction: DIRECTION,
      itemId: 'so-suea',
      grade: 'missed',
      scheduling: { before: grown, after: missed },
      intervalAtShowing: grown.intervalDays,
      reviewedAt: NOW,
    })

    const row = await progressFor('so-suea')
    expect(row?.intervalDays).toBe(0)
    expect(row?.lapses).toBe(1)
  })

  it('logs a reinforcement showing without touching the schedule', async () => {
    const scheduled = applyGrade(newState(NOW), 'got', NOW)
    await recordReview({
      itemType: 'character',
      direction: DIRECTION,
      itemId: 'do-dek',
      grade: 'got',
      scheduling: { before: newState(NOW), after: scheduled },
      intervalAtShowing: 0,
      reviewedAt: NOW,
    })

    await recordReview({
      itemType: 'character',
      direction: DIRECTION,
      itemId: 'do-dek',
      grade: 'got',
      scheduling: null,
      intervalAtShowing: scheduled.intervalDays,
      reviewedAt: NOW,
    })

    const row = await progressFor('do-dek')
    // Still one day out — the in-session repeat must not double it.
    expect(row?.intervalDays).toBe(1)
    expect(row?.reps).toBe(1)

    const log = await db.select().from(schema.reviewLog)
    expect(log).toHaveLength(2)
    expect(log.map((entry) => entry.reinforcement)).toEqual([false, true])
  })

  it('appends one log row per showing, with the interval either side', async () => {
    const before = newState(NOW)
    const after = applyGrade(before, 'got', NOW)

    await recordReview({
      itemType: 'character',
      direction: DIRECTION,
      itemId: 'to-tao',
      grade: 'got',
      scheduling: { before, after },
      intervalAtShowing: 0,
      reviewedAt: NOW,
    })

    const [entry] = await db.select().from(schema.reviewLog)
    expect(entry).toMatchObject({
      itemType: 'character',
      itemId: 'to-tao',
      grade: 'got',
      reinforcement: false,
      intervalBefore: 0,
      intervalAfter: 1,
    })
  })

  it('schedules the two directions independently', async () => {
    // Reading a letter and producing it are different skills, so grading one
    // must not move the other.
    const before = newState(NOW)
    await recordReview({
      itemType: 'character',
      direction: 'recognise',
      itemId: 'ngo-ngu',
      grade: 'got',
      scheduling: { before, after: applyGrade(before, 'got', NOW) },
      intervalAtShowing: 0,
      reviewedAt: NOW,
    })
    await recordReview({
      itemType: 'character',
      direction: 'produce',
      itemId: 'ngo-ngu',
      grade: 'missed',
      scheduling: { before, after: applyGrade(before, 'missed', NOW) },
      intervalAtShowing: 0,
      reviewedAt: NOW,
    })

    const rows = await db.select().from(schema.itemProgress)
    expect(rows).toHaveLength(2)

    const recognise = rows.find((row) => row.direction === 'recognise')
    const produce = rows.find((row) => row.direction === 'produce')
    expect(recognise?.intervalDays).toBe(1)
    expect(produce?.intervalDays).toBe(0)
    expect(produce?.lapses).toBe(1)
  })

  it('keeps vowels and characters in separate rows even if ids collided', async () => {
    const before = newState(NOW)
    for (const itemType of ['character', 'vowel'] as const) {
      await recordReview({
        itemType,
        direction: 'recognise',
        itemId: 'shared-id',
        grade: 'got',
        scheduling: { before, after: applyGrade(before, 'got', NOW) },
        intervalAtShowing: 0,
        reviewedAt: NOW,
      })
    }

    const rows = await db.select().from(schema.itemProgress)
    expect(rows).toHaveLength(2)
  })
})
