import { describe, expect, it } from 'vitest'

import {
  LEECH_LAPSE_THRESHOLD,
  MASTERY_INTERVAL_DAYS,
  MAX_INTERVAL_DAYS,
  MAX_REINFORCEMENTS_PER_ITEM,
  type SrsState,
  addDays,
  applyGrade,
  buildSession,
  currentEntry,
  gateDistance,
  gradeCurrent,
  isBatchMastered,
  isDue,
  isLeech,
  newState,
  nextInterval,
  unlockedBatches,
} from './srs'

const NOW = new Date('2026-08-14T09:00:00.000Z')

/**
 * Fisher-Yates picks `j = floor(rng * (i + 1))`, so a value just under 1 always
 * selects j === i and every swap is a no-op — input order is preserved.
 * (Returning 0 would swap everything to the front, not leave it alone.)
 */
const keepOrder = () => 0.999999

function state(overrides: Partial<SrsState> = {}): SrsState {
  return { ...newState(NOW), ...overrides }
}

describe('interval ladder', () => {
  it('doubles from 0 -> 1 -> 2 -> 4 -> 8 on correct recalls', () => {
    const ladder: number[] = []
    let current = 0
    for (let i = 0; i < 4; i++) {
      current = nextInterval(current, 'got')
      ladder.push(current)
    }
    expect(ladder).toEqual([1, 2, 4, 8])
  })

  it('caps at 180 days rather than doubling forever', () => {
    expect(nextInterval(128, 'got')).toBe(MAX_INTERVAL_DAYS)
    expect(nextInterval(MAX_INTERVAL_DAYS, 'got')).toBe(MAX_INTERVAL_DAYS)
  })

  it('resets to 0 on a miss', () => {
    expect(nextInterval(64, 'missed')).toBe(0)
  })
})

describe('applyGrade', () => {
  it('schedules a correct recall the right number of days out', () => {
    const after = applyGrade(state({ intervalDays: 4, reps: 3 }), 'got', NOW)
    expect(after.intervalDays).toBe(8)
    expect(after.dueAt).toEqual(addDays(NOW, 8))
    expect(after.reps).toBe(4)
    expect(after.lapses).toBe(0)
  })

  it('sends a first correct recall out one day', () => {
    const after = applyGrade(state(), 'got', NOW)
    expect(after.intervalDays).toBe(1)
    expect(after.dueAt).toEqual(addDays(NOW, 1))
  })

  it('resets the interval and counts a lapse on a miss', () => {
    const after = applyGrade(state({ intervalDays: 32, reps: 6, lapses: 1 }), 'missed', NOW)
    expect(after.intervalDays).toBe(0)
    expect(after.lapses).toBe(2)
    expect(after.reps).toBe(7)
    expect(isDue(after, NOW)).toBe(true)
  })
})

describe('leeches', () => {
  it('flags a card only once it has been missed enough times', () => {
    expect(isLeech(state({ lapses: LEECH_LAPSE_THRESHOLD - 1 }))).toBe(false)
    expect(isLeech(state({ lapses: LEECH_LAPSE_THRESHOLD }))).toBe(true)
  })
})

describe('batch gating', () => {
  const mastered = state({ intervalDays: MASTERY_INTERVAL_DAYS, reps: 3 })
  const notYet = state({ intervalDays: 2, reps: 2 })

  it('requires every character in the batch to reach the mastery interval', () => {
    expect(isBatchMastered([mastered, mastered])).toBe(true)
    expect(isBatchMastered([mastered, notYet])).toBe(false)
  })

  it('never treats an empty batch as mastered', () => {
    expect(isBatchMastered([])).toBe(false)
  })

  it('reports how many characters still need to clear the gate', () => {
    expect(gateDistance([mastered, notYet], 7)).toBe(6)
    expect(gateDistance([mastered, mastered, mastered], 3)).toBe(0)
  })

  it('unlocks batch 1 up front and nothing further', () => {
    const progress = new Map<number, SrsState[]>()
    expect(unlockedBatches([1, 2, 3, 4, 5], progress)).toEqual([1])
  })

  it('unlocks the next batch only when the current one is fully mastered', () => {
    const progress = new Map<number, SrsState[]>([
      [1, [mastered, mastered]],
      [2, [mastered, notYet]],
    ])
    // Batch 2 is open because batch 1 is done, but one straggler in batch 2
    // holds batch 3 shut.
    expect(unlockedBatches([1, 2, 3, 4, 5], progress)).toEqual([1, 2])
  })

  it('does not skip ahead past an unmastered batch', () => {
    const progress = new Map<number, SrsState[]>([
      [1, [mastered]],
      [2, [notYet]],
      [3, [mastered]],
    ])
    // Batch 3 being mastered is irrelevant — the gate is sequential.
    expect(unlockedBatches([1, 2, 3, 4, 5], progress)).toEqual([1, 2])
  })
})

describe('session queue', () => {
  const overdue = state({ intervalDays: 2, reps: 2, dueAt: addDays(NOW, -1) })
  const notDue = state({ intervalDays: 8, reps: 4, dueAt: addDays(NOW, 3) })

  it('includes only items that are due', () => {
    const session = buildSession(
      [
        { id: 'due', state: overdue },
        { id: 'later', state: notDue },
      ],
      NOW,
      { rng: keepOrder },
    )
    expect(session.queue.map((entry) => entry.id)).toEqual(['due'])
  })

  it('puts reviews ahead of new material', () => {
    const session = buildSession(
      [
        { id: 'fresh', state: newState(NOW) },
        { id: 'review', state: overdue },
      ],
      NOW,
      { rng: keepOrder },
    )
    expect(session.queue.map((entry) => entry.id)).toEqual(['review', 'fresh'])
    expect(session.queue.map((entry) => entry.kind)).toEqual(['review', 'new'])
  })

  it('caps how many first-time items enter one sitting', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: `c${i}`,
      state: newState(NOW),
    }))
    const session = buildSession(items, NOW, { maxNew: 5, rng: keepOrder })
    expect(session.queue).toHaveLength(5)
  })

  it('re-queues a missed card at the end rather than showing it again straight away', () => {
    const session = buildSession(
      [
        { id: 'a', state: overdue },
        { id: 'b', state: overdue },
        { id: 'c', state: overdue },
      ],
      NOW,
      { rng: keepOrder },
    )

    const { session: after } = gradeCurrent(session, 'missed', overdue, NOW)

    expect(currentEntry(after)?.id).toBe('b')
    expect(after.queue.map((entry) => entry.id)).toEqual(['b', 'c', 'a'])
    expect(after.queue.at(-1)?.reinforcement).toBe(true)
  })

  it('shows a brand-new card once more in the same session after a correct recall', () => {
    const session = buildSession(
      [
        { id: 'fresh', state: newState(NOW) },
        { id: 'other', state: overdue },
      ],
      NOW,
      { rng: keepOrder },
    )
    // queue is ['other' (review), 'fresh' (new)] — clear the review first
    const afterReview = gradeCurrent(session, 'got', overdue, NOW).session
    const afterNew = gradeCurrent(afterReview, 'got', newState(NOW), NOW).session

    expect(afterNew.queue.map((entry) => entry.id)).toEqual(['fresh'])
    expect(afterNew.queue[0].reinforcement).toBe(true)
  })

  it('does not reschedule on a reinforcement showing', () => {
    const session = buildSession([{ id: 'fresh', state: newState(NOW) }], NOW, {
      rng: keepOrder,
    })

    const first = gradeCurrent(session, 'got', newState(NOW), NOW)
    // First showing advances the schedule to one day out.
    expect(first.scheduling?.after.intervalDays).toBe(1)

    const scheduled = first.scheduling!.after
    const second = gradeCurrent(first.session, 'got', scheduled, NOW)

    // The in-session repeat must not double it to two days.
    expect(second.scheduling).toBeNull()
    expect(second.session.queue).toHaveLength(0)
    expect(second.session.completed).toEqual(['fresh'])
  })

  it('stops re-queueing a card that keeps being missed', () => {
    let session = buildSession([{ id: 'hard', state: overdue }], NOW, { rng: keepOrder })

    for (let i = 0; i < MAX_REINFORCEMENTS_PER_ITEM; i++) {
      session = gradeCurrent(session, 'missed', overdue, NOW).session
      expect(session.queue).toHaveLength(1)
    }

    session = gradeCurrent(session, 'missed', overdue, NOW).session
    expect(session.queue).toHaveLength(0)
    expect(session.completed).toEqual(['hard'])
  })

  it('logs the schedule change once per real showing', () => {
    const session = buildSession([{ id: 'a', state: overdue }], NOW, { rng: keepOrder })
    const result = gradeCurrent(session, 'got', overdue, NOW)

    expect(result.scheduling).toEqual({
      id: 'a',
      before: overdue,
      after: applyGrade(overdue, 'got', NOW),
    })
  })
})
