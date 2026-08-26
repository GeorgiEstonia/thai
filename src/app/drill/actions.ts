'use server'

import { type Direction, type ItemType, findItem } from '@/content/items'
import { requireAuth } from '@/lib/auth'
import { loadOneState, recordReview } from '@/lib/mutations'
import { type Grade, applyGrade, newState } from '@/lib/srs'
import { saveNote } from '@/lib/words'

/**
 * Grades one showing.
 *
 * The client owns the session queue, but the schedule is recomputed here from
 * what is actually stored rather than from anything the browser sends — the
 * client only says which card, which direction, and which button.
 */
export async function gradeCard(
  itemType: ItemType,
  itemId: string,
  direction: Direction,
  grade: Grade,
  reinforcement: boolean,
): Promise<void> {
  await requireAuth()

  // Words live in the database, so only the authored content is checked here.
  if (itemType !== 'word' && !findItem(itemType, itemId)) {
    throw new Error(`Unknown item: ${itemType}:${itemId}`)
  }

  const now = new Date()
  const before = (await loadOneState(itemType, itemId, direction)) ?? newState(now)

  await recordReview({
    itemType,
    itemId,
    direction,
    grade,
    // A reinforcement showing is logged but must not move the due date.
    scheduling: reinforcement ? null : { before, after: applyGrade(before, grade, now) },
    intervalAtShowing: before.intervalDays,
    reviewedAt: now,
  })
}

/** Saves a mnemonic you wrote yourself. Empty text clears it. */
export async function saveMnemonic(
  itemType: ItemType,
  itemId: string,
  mnemonic: string,
): Promise<void> {
  await requireAuth()
  await saveNote(itemType, itemId, mnemonic)
}
