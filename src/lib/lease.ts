import { and, eq, lt, sql } from 'drizzle-orm'

import { ensureSchema, getDb, schema } from './db'

/**
 * One worker at a time on a long background job.
 *
 * While background work only ran in an open tab, the tab was the lock: close
 * it and the work stopped. A job that continues server-side after the response
 * has no such limit, so opening the app again twenty seconds later would set a
 * second worker on the same backlog and pay the model twice to describe the
 * same words.
 *
 * The claim expires rather than being released, because the thing most likely
 * to hold one is a function that has just been killed mid-batch. A lock that
 * needed releasing would wedge the job shut until someone noticed; this one
 * reopens by itself one stale period later.
 */

/** Long enough to cover a batch that is slow, short enough to forgive a crash. */
export const LEASE_TTL_MS = 2 * 60 * 1000

/**
 * Takes the job, unless someone holds it and has been heard from recently.
 *
 * The insert and the steal are both conditional and both atomic, so two
 * requests arriving together cannot each come away believing they won: one
 * writes the row, the other's `where` no longer matches.
 */
export async function claimLease(id: string, ttlMs: number = LEASE_TTL_MS): Promise<boolean> {
  await ensureSchema()
  const db = getDb()

  const taken = await db
    .insert(schema.jobLeases)
    .values({ id, heldAt: new Date() })
    .onConflictDoNothing()
    .returning({ id: schema.jobLeases.id })
  if (taken.length > 0) return true

  // Held — but whoever held it may be gone. Stealing is allowed only if the
  // heartbeat is older than the TTL, checked in the same statement that writes.
  const stolen = await db
    .update(schema.jobLeases)
    .set({ heldAt: new Date() })
    .where(
      and(
        eq(schema.jobLeases.id, id),
        lt(schema.jobLeases.heldAt, sql`now() - ${`${ttlMs} milliseconds`}::interval`),
      ),
    )
    .returning({ id: schema.jobLeases.id })

  return stolen.length > 0
}

/** Says the holder is still alive, so nobody steals the job mid-batch. */
export async function refreshLease(id: string): Promise<void> {
  await ensureSchema()
  await getDb()
    .update(schema.jobLeases)
    .set({ heldAt: new Date() })
    .where(eq(schema.jobLeases.id, id))
}

/** Hands the job back straight away, rather than leaving it to expire. */
export async function releaseLease(id: string): Promise<void> {
  await ensureSchema()
  await getDb().delete(schema.jobLeases).where(eq(schema.jobLeases.id, id))
}
