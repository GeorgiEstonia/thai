import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { __setTestDb, getDb, schema } from './db'
import { LEASE_TTL_MS, claimLease, refreshLease, releaseLease } from './lease'

/**
 * Background work now outlives the tab that started it, so the tab is no
 * longer the thing stopping two workers running at once. These check that the
 * lease is: exclusive while held, stealable once stale, and never wedged shut
 * by a worker that died holding it.
 */

const client = new PGlite()
const db = drizzle(client, { schema })
__setTestDb(db as unknown as ReturnType<typeof getDb>)

beforeAll(async () => {
  const dir = path.resolve(process.cwd(), 'drizzle')
  await client.exec(
    readdirSync(dir)
      .filter((file) => file.endsWith('.sql'))
      .sort()
      .map((file) => readFileSync(path.join(dir, file), 'utf8'))
      .join('\n'),
  )
})

beforeEach(async () => {
  await client.exec('truncate job_leases')
})

afterAll(async () => {
  __setTestDb(null)
  await client.close()
})

/** Backdates the heartbeat, standing in for time passing. */
async function age(id: string, ms: number) {
  await db.execute(
    sql`update job_leases set held_at = now() - ${`${ms} milliseconds`}::interval where id = ${id}`,
  )
}

describe('claimLease', () => {
  it('gives the job to the first caller', async () => {
    expect(await claimLease('describe')).toBe(true)
  })

  it('refuses a second caller while the first is alive', async () => {
    expect(await claimLease('describe')).toBe(true)
    expect(await claimLease('describe')).toBe(false)
  })

  it('keeps separate jobs independent', async () => {
    expect(await claimLease('describe')).toBe(true)
    expect(await claimLease('regroup')).toBe(true)
  })

  /**
   * The case that matters: a function killed mid-batch leaves the row behind.
   * If that locked the job permanently, the backlog would never finish and
   * nothing would say why.
   */
  it('lets a stale claim be stolen, so a dead worker does not wedge the job', async () => {
    expect(await claimLease('describe')).toBe(true)
    await age('describe', LEASE_TTL_MS + 1000)
    expect(await claimLease('describe')).toBe(true)
  })

  it('does not let a claim be stolen just before it goes stale', async () => {
    expect(await claimLease('describe')).toBe(true)
    await age('describe', LEASE_TTL_MS - 10_000)
    expect(await claimLease('describe')).toBe(false)
  })

  it('a steal resets the clock, so the thief is not immediately robbed', async () => {
    await claimLease('describe')
    await age('describe', LEASE_TTL_MS + 1000)
    expect(await claimLease('describe')).toBe(true)
    expect(await claimLease('describe')).toBe(false)
  })
})

describe('refreshLease', () => {
  it('keeps a long batch from having its job stolen underneath it', async () => {
    await claimLease('describe')
    await age('describe', LEASE_TTL_MS + 1000)
    await refreshLease('describe')
    expect(await claimLease('describe')).toBe(false)
  })

  it('does nothing for a job nobody holds', async () => {
    await refreshLease('describe')
    expect(await claimLease('describe')).toBe(true)
  })
})

describe('releaseLease', () => {
  it('hands the job straight back', async () => {
    await claimLease('describe')
    await releaseLease('describe')
    expect(await claimLease('describe')).toBe(true)
  })
})
