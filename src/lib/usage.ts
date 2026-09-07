import { desc, gte } from 'drizzle-orm'

import { ensureSchema, getDb, schema } from './db'

/**
 * What the app spends on the model, metered by the app itself.
 *
 * Anthropic's organisation cost report would need an admin credential this app
 * doesn't have, and would report the whole account rather than this one deck.
 * Every model call here goes through a single wrapper, so counting the tokens
 * it reports back is both exact for this app and free to collect.
 *
 * What that does not cover: anything else on the same API key. This is the
 * app's own spend, not the account's bill.
 */

/** US dollars per million tokens. */
export interface Pricing {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

/**
 * Prices as published for the first-party API.
 *
 * Cache reads are a tenth of the input price and cache writes a quarter more
 * than it — the app does not use caching today, but a call that starts to will
 * be costed correctly rather than silently under-reported.
 */
export const PRICING: Record<string, Pricing> = {
  'claude-opus-5': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
}

/** Anything unrecognised is costed as the model the app actually uses, rather
 *  than as free — an unknown model reported at zero would quietly hide spend. */
const FALLBACK = PRICING['claude-opus-5']

export interface TokenCounts {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

/** Cost in millionths of a dollar. Integer, so summing thousands of rows can't drift. */
export function costMicros(model: string, tokens: TokenCounts): number {
  const price = PRICING[model] ?? FALLBACK

  const dollars =
    (tokens.inputTokens * price.input +
      tokens.outputTokens * price.output +
      tokens.cacheReadTokens * price.cacheRead +
      tokens.cacheWriteTokens * price.cacheWrite) /
    1_000_000

  return Math.round(dollars * 1_000_000)
}

/** Reads the token counts off a response, whatever the SDK left undefined. */
export function tokensFrom(usage: {
  input_tokens?: number | null
  output_tokens?: number | null
  cache_read_input_tokens?: number | null
  cache_creation_input_tokens?: number | null
}): TokenCounts {
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  }
}

export async function recordUsage(
  operation: string,
  model: string,
  tokens: TokenCounts,
): Promise<void> {
  await ensureSchema()
  await getDb()
    .insert(schema.apiUsage)
    .values({ operation, model, ...tokens, costMicros: costMicros(model, tokens) })
}

export interface UsageTotals {
  calls: number
  inputTokens: number
  outputTokens: number
  costMicros: number
}

export interface UsageReport {
  windows: { label: string; days: number | null; totals: UsageTotals }[]
  byOperation: { operation: string; totals: UsageTotals }[]
  /** Spend per day, most recent first, for the last month. */
  daily: { day: string; costMicros: number; calls: number }[]
  recent: {
    at: Date
    operation: string
    model: string
    inputTokens: number
    outputTokens: number
    costMicros: number
  }[]
}

const EMPTY: UsageTotals = { calls: 0, inputTokens: 0, outputTokens: 0, costMicros: 0 }

function add(totals: UsageTotals, row: { inputTokens: number; outputTokens: number; costMicros: number }): UsageTotals {
  return {
    calls: totals.calls + 1,
    inputTokens: totals.inputTokens + row.inputTokens,
    outputTokens: totals.outputTokens + row.outputTokens,
    costMicros: totals.costMicros + row.costMicros,
  }
}

/** Local calendar day, so "today" means today where you are, not in UTC. */
function dayKey(date: Date): string {
  const offset = date.getTime() - date.getTimezoneOffset() * 60_000
  return new Date(offset).toISOString().slice(0, 10)
}

export async function usageReport(now: Date = new Date()): Promise<UsageReport> {
  await ensureSchema()

  // A year is far more than this app will ever accumulate, and it keeps the
  // query bounded rather than growing without limit.
  const since = new Date(now.getTime() - 365 * 86_400_000)
  const rows = await getDb()
    .select()
    .from(schema.apiUsage)
    .where(gte(schema.apiUsage.at, since))
    .orderBy(desc(schema.apiUsage.at))

  const windows = [
    { label: 'Today', days: 1 },
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'All time', days: null },
  ].map((window) => {
    const cutoff =
      window.days === null ? null : new Date(now.getTime() - window.days * 86_400_000)

    // "Today" means since midnight, not the last 24 hours.
    const start =
      window.days === 1 ? new Date(`${dayKey(now)}T00:00:00`) : cutoff

    const totals = rows
      .filter((row) => start === null || row.at.getTime() >= start.getTime())
      .reduce(add, EMPTY)

    return { label: window.label, days: window.days, totals }
  })

  const operations = new Map<string, UsageTotals>()
  for (const row of rows) {
    operations.set(row.operation, add(operations.get(row.operation) ?? EMPTY, row))
  }

  const days = new Map<string, { costMicros: number; calls: number }>()
  const monthAgo = now.getTime() - 30 * 86_400_000
  for (const row of rows) {
    if (row.at.getTime() < monthAgo) continue
    const key = dayKey(row.at)
    const entry = days.get(key) ?? { costMicros: 0, calls: 0 }
    days.set(key, { costMicros: entry.costMicros + row.costMicros, calls: entry.calls + 1 })
  }

  return {
    windows,
    byOperation: [...operations.entries()]
      .map(([operation, totals]) => ({ operation, totals }))
      .sort((a, b) => b.totals.costMicros - a.totals.costMicros),
    daily: [...days.entries()]
      .map(([day, value]) => ({ day, ...value }))
      .sort((a, b) => b.day.localeCompare(a.day)),
    recent: rows.slice(0, 20),
  }
}

/** Micro-dollars as money. Small amounts keep their cents rather than reading $0.00. */
export function formatCost(micros: number): string {
  const dollars = micros / 1_000_000
  if (dollars === 0) return '$0.00'
  if (dollars < 0.01) return `<$0.01`
  return `$${dollars.toFixed(2)}`
}
