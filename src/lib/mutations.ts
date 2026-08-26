import { and, eq } from 'drizzle-orm'

import type { Direction, ItemType } from '@/content/items'

import { getDb, schema } from './db'
import type { Grade, SrsState } from './srs'

/**
 * Every write in the app goes through this module.
 *
 * Keeping the writes in one place means the "grade a card" state transition —
 * upsert the schedule, append to the log, keep the two consistent — exists
 * exactly once, and any later change is a change to this file rather than to
 * every screen.
 */

export interface ReviewRecord {
  itemType: ItemType
  itemId: string
  direction: Direction
  grade: Grade
  /**
   * The schedule change to persist. Null for an in-session reinforcement
   * showing: those are logged for the record but must not move the due date.
   */
  scheduling: { before: SrsState; after: SrsState } | null
  /** The interval the card was sitting at when it was shown. */
  intervalAtShowing: number
  reviewedAt: Date
}

export async function recordReview(record: ReviewRecord): Promise<void> {
  const { itemType, itemId, direction, grade, scheduling, intervalAtShowing, reviewedAt } = record

  await getDb().transaction(async (tx) => {
    if (scheduling) {
      const { after } = scheduling
      await tx
        .insert(schema.itemProgress)
        .values({
          itemType,
          itemId,
          direction,
          intervalDays: after.intervalDays,
          dueAt: after.dueAt,
          reps: after.reps,
          lapses: after.lapses,
          introducedAt: reviewedAt,
        })
        .onConflictDoUpdate({
          target: [
            schema.itemProgress.itemType,
            schema.itemProgress.itemId,
            schema.itemProgress.direction,
          ],
          set: {
            intervalDays: after.intervalDays,
            dueAt: after.dueAt,
            reps: after.reps,
            lapses: after.lapses,
          },
        })
    }

    await tx.insert(schema.reviewLog).values({
      itemType,
      itemId,
      direction,
      grade,
      reinforcement: scheduling === null,
      intervalBefore: scheduling?.before.intervalDays ?? intervalAtShowing,
      intervalAfter: scheduling?.after.intervalDays ?? intervalAtShowing,
      reviewedAt,
    })
  })
}

export async function loadOneState(
  itemType: ItemType,
  itemId: string,
  direction: Direction,
): Promise<SrsState | null> {
  const [row] = await getDb()
    .select()
    .from(schema.itemProgress)
    .where(
      and(
        eq(schema.itemProgress.itemType, itemType),
        eq(schema.itemProgress.itemId, itemId),
        eq(schema.itemProgress.direction, direction),
      ),
    )

  if (!row) return null
  return {
    intervalDays: row.intervalDays,
    dueAt: row.dueAt,
    reps: row.reps,
    lapses: row.lapses,
  }
}
