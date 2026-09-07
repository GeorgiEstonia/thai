import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { __setTestDb, getDb, schema } from './db'
import { loadStats } from './stats'

/**
 * Streaks and accuracy are computed from the review log rather than kept in a
 * counter, so these check the arithmetic against rows a real session would
 * have written.
 */

const client = new PGlite()
const db = drizzle(client, { schema })
__setTestDb(db as unknown as ReturnType<typeof getDb>)

function migrationSql(): string {
  const dir = path.resolve(process.cwd(), 'drizzle')
  return readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(path.join(dir, file), 'utf8'))
    .join('\n')
}

beforeAll(async () => {
  await client.exec(migrationSql())
})

beforeEach(async () => {
  await client.exec('truncate review_log, item_progress cascade')
})

afterAll(async () => {
  __setTestDb(null)
  await client.close()
})

const NOW = new Date('2026-09-10T12:00:00')

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 86_400_000)
}

async function logReview(at: Date, grade: 'got' | 'missed', reinforcement = false) {
  await db.insert(schema.reviewLog).values({
    itemType: 'word',
    itemId: 'w1',
    direction: 'recognise',
    grade,
    reinforcement,
    intervalBefore: 0,
    intervalAfter: 1,
    reviewedAt: at,
  })
}

describe('loadStats', () => {
  it('reports nothing for an empty log rather than dividing by zero', async () => {
    const stats = await loadStats(NOW)
    expect(stats.totals.reviews).toBe(0)
    expect(stats.accuracy.allTime).toBeNull()
    expect(stats.currentStreak).toBe(0)
    expect(stats.averagePerActiveDay).toBe(0)
  })

  it('counts a run of consecutive days as a streak', async () => {
    for (const back of [0, 1, 2, 3]) await logReview(daysAgo(back), 'got')

    const stats = await loadStats(NOW)
    expect(stats.currentStreak).toBe(4)
    expect(stats.longestStreak).toBe(4)
  })

  it('does not break the streak just because today is not done yet', async () => {
    // Practised yesterday and the day before, nothing yet today.
    for (const back of [1, 2, 3]) await logReview(daysAgo(back), 'got')

    const stats = await loadStats(NOW)
    expect(stats.currentStreak).toBe(3)
  })

  it('ends the streak at a missed day', async () => {
    for (const back of [0, 1, 3, 4]) await logReview(daysAgo(back), 'got')

    const stats = await loadStats(NOW)
    expect(stats.currentStreak).toBe(2)
    expect(stats.longestStreak).toBe(2)
  })

  it('works out accuracy from what was answered', async () => {
    await logReview(daysAgo(0), 'got')
    await logReview(daysAgo(0), 'got')
    await logReview(daysAgo(0), 'got')
    await logReview(daysAgo(0), 'missed')

    const stats = await loadStats(NOW)
    expect(stats.accuracy.allTime).toBe(75)
    expect(stats.totals.right).toBe(3)
  })

  it('separates recent accuracy from all-time', async () => {
    await logReview(daysAgo(1), 'got')
    await logReview(daysAgo(60), 'missed')

    const stats = await loadStats(NOW)
    expect(stats.accuracy.last7).toBe(100)
    expect(stats.accuracy.allTime).toBe(50)
  })

  it('counts in-session repeats as practice but not as scheduling', async () => {
    await logReview(daysAgo(0), 'got', false)
    await logReview(daysAgo(0), 'got', true)

    const stats = await loadStats(NOW)
    expect(stats.totals.reviews).toBe(2)
    expect(stats.totals.scheduled).toBe(1)
  })

  it('counts how many of the last thirty days were practised', async () => {
    for (const back of [0, 5, 10, 40]) await logReview(daysAgo(back), 'got')

    const stats = await loadStats(NOW)
    expect(stats.activeDaysLast30).toBe(3)
  })

  it('sorts cards onto the ladder and finds the ones you keep missing', async () => {
    await db.insert(schema.itemProgress).values([
      { itemType: 'word', itemId: 'a', direction: 'recognise', intervalDays: 0, reps: 0 },
      { itemType: 'word', itemId: 'b', direction: 'recognise', intervalDays: 2, reps: 3 },
      { itemType: 'word', itemId: 'c', direction: 'recognise', intervalDays: 14, reps: 6 },
      { itemType: 'word', itemId: 'd', direction: 'recognise', intervalDays: 90, reps: 9 },
      { itemType: 'word', itemId: 'e', direction: 'recognise', intervalDays: 1, reps: 9, lapses: 5 },
    ])

    const stats = await loadStats(NOW)
    const byLabel = Object.fromEntries(stats.maturity.map((row) => [row.label, row.count]))

    expect(byLabel['Not started']).toBe(1)
    expect(byLabel['Learning']).toBe(2)
    expect(byLabel['Familiar']).toBe(1)
    expect(byLabel['Mature']).toBe(1)
    expect(stats.deck.leeches).toBe(1)
  })
})
