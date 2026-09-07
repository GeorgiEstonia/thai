import { desc, gte } from 'drizzle-orm'

import { getDb, schema } from './db'
import { LEECH_LAPSE_THRESHOLD, type SrsState, isDue } from './srs'
import { loadProgress } from './practice'

/**
 * What the review log has been quietly collecting.
 *
 * Every grading since the first day has been appended to review_log and never
 * read back — it was written for exactly this. Nothing here is derived from a
 * counter kept up to date as you go, which would have been wrong the first
 * time a write failed; it is all recomputed from the log.
 */

const MS_PER_DAY = 86_400_000

/** Local calendar day, so a session at 11pm counts for that day, not the next. */
function dayKey(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)
}

export interface DayCount {
  day: string
  reviews: number
  right: number
}

export interface Stats {
  /** Answers given, by local day, oldest first — the practice-frequency chart. */
  days: DayCount[]
  /** Consecutive days up to today with at least one answer. */
  currentStreak: number
  longestStreak: number
  /** Days practised out of the last 30. */
  activeDaysLast30: number
  totals: {
    reviews: number
    right: number
    /** Answers that moved a schedule; in-session repeats are excluded. */
    scheduled: number
  }
  accuracy: { last7: number | null; last30: number | null; allTime: number | null }
  /** How the deck is spread across the doubling ladder. */
  maturity: { label: string; count: number }[]
  deck: { tracked: number; due: number; leeches: number; never: number }
  averagePerActiveDay: number
}

function accuracyOf(rows: { grade: string }[]): number | null {
  if (rows.length === 0) return null
  return Math.round((rows.filter((row) => row.grade === 'got').length / rows.length) * 100)
}

function streaks(days: Set<string>, now: Date): { current: number; longest: number } {
  if (days.size === 0) return { current: 0, longest: 0 }

  const sorted = [...days].sort()
  let longest = 1
  let run = 1

  for (let i = 1; i < sorted.length; i++) {
    const previous = new Date(`${sorted[i - 1]}T00:00:00`).getTime()
    const current = new Date(`${sorted[i]}T00:00:00`).getTime()
    run = current - previous === MS_PER_DAY ? run + 1 : 1
    longest = Math.max(longest, run)
  }

  // A streak survives today being unpractised — until tomorrow, today is still
  // in progress, and reporting zero at breakfast would be discouraging noise.
  let current = 0
  for (let back = 0; ; back++) {
    const day = dayKey(new Date(now.getTime() - back * MS_PER_DAY))
    if (days.has(day)) current++
    else if (back > 0) break
  }

  return { current, longest }
}

/** Where a card sits on the doubling ladder, in words rather than numbers. */
function maturityOf(state: SrsState): string {
  if (state.reps === 0) return 'Not started'
  if (state.intervalDays === 0) return 'Relearning'
  if (state.intervalDays < 7) return 'Learning'
  if (state.intervalDays < 30) return 'Familiar'
  return 'Mature'
}

const MATURITY_ORDER = ['Not started', 'Relearning', 'Learning', 'Familiar', 'Mature']

export async function loadStats(now: Date = new Date()): Promise<Stats> {
  const since = new Date(now.getTime() - 365 * MS_PER_DAY)

  const [log, progress] = await Promise.all([
    getDb()
      .select()
      .from(schema.reviewLog)
      .where(gte(schema.reviewLog.reviewedAt, since))
      .orderBy(desc(schema.reviewLog.reviewedAt)),
    loadProgress(),
  ])

  const byDay = new Map<string, DayCount>()
  for (const row of log) {
    const key = dayKey(row.reviewedAt)
    const entry = byDay.get(key) ?? { day: key, reviews: 0, right: 0 }
    entry.reviews++
    if (row.grade === 'got') entry.right++
    byDay.set(key, entry)
  }

  const days = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day))
  const { current, longest } = streaks(new Set(byDay.keys()), now)

  const cutoff = (n: number) => now.getTime() - n * MS_PER_DAY
  const last7 = log.filter((row) => row.reviewedAt.getTime() >= cutoff(7))
  const last30 = log.filter((row) => row.reviewedAt.getTime() >= cutoff(30))

  const maturity = new Map<string, number>()
  let due = 0
  let leeches = 0
  for (const state of progress.values()) {
    const label = maturityOf(state)
    maturity.set(label, (maturity.get(label) ?? 0) + 1)
    if (isDue(state, now)) due++
    if (state.lapses >= LEECH_LAPSE_THRESHOLD) leeches++
  }

  const activeDaysLast30 = days.filter(
    (day) => new Date(`${day.day}T00:00:00`).getTime() >= cutoff(30),
  ).length

  return {
    days,
    currentStreak: current,
    longestStreak: longest,
    activeDaysLast30,
    totals: {
      reviews: log.length,
      right: log.filter((row) => row.grade === 'got').length,
      scheduled: log.filter((row) => !row.reinforcement).length,
    },
    accuracy: {
      last7: accuracyOf(last7),
      last30: accuracyOf(last30),
      allTime: accuracyOf(log),
    },
    maturity: MATURITY_ORDER.filter((label) => maturity.has(label)).map((label) => ({
      label,
      count: maturity.get(label) ?? 0,
    })),
    deck: {
      tracked: progress.size,
      due,
      leeches,
      never: 0,
    },
    averagePerActiveDay:
      days.length === 0 ? 0 : Math.round(log.length / days.length),
  }
}
