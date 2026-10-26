import { describe, expect, it } from 'vitest'

import {
  LAPSE_GAPS,
  LAPSE_RECALLS_REQUIRED,
  LEECH_LAPSE_THRESHOLD,
  MASTERY_INTERVAL_DAYS,
  MAX_INTERVAL_DAYS,
  MAX_LAPSE_SHOWINGS,
  type SessionState,
  type SrsState,
  addDays,
  applyGrade,
  buildSession,
  currentEntry,
  dropFromSession,
  gateDistance,
  gradeCurrent,
  isBatchMastered,
  isDue,
  isLeech,
  newState,
  nextInterval,
  toPriority,
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
    // It must keep coming back — but a word you cannot get right today should
    // not be able to hold the session open indefinitely.
    let session = buildSession([{ id: 'hard', state: overdue }], NOW, { rng: keepOrder })

    for (let i = 0; i < MAX_LAPSE_SHOWINGS; i++) {
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

describe('dropFromSession', () => {
  const session: SessionState = {
    queue: [
      { id: 'word:a:recognise', kind: 'new', reinforcement: false },
      { id: 'word:b:recognise', kind: 'review', reinforcement: false },
      { id: 'word:a:recognise', kind: 'new', reinforcement: true },
    ],
    reinforcementCounts: { 'word:a:recognise': 1 },
    lapses: {},
    completed: ['word:a:recognise'],
  }

  it('removes every queued showing of the item, not just the current one', () => {
    const after = dropFromSession(session, 'word:a:recognise')
    expect(after.queue.map((entry) => entry.id)).toEqual(['word:b:recognise'])
  })

  it('leaves the rest of the queue in order', () => {
    const after = dropFromSession(session, 'word:a:recognise')
    expect(after.queue).toEqual([{ id: 'word:b:recognise', kind: 'review', reinforcement: false }])
  })

  it('forgets the item entirely rather than reporting it as done', () => {
    const after = dropFromSession(session, 'word:a:recognise')
    expect(after.completed).toEqual([])
    expect(after.reinforcementCounts).toEqual({})
  })

  it('does nothing when the item is not in the session', () => {
    expect(dropFromSession(session, 'word:zz:recognise')).toEqual(session)
  })
})

describe('dropFromSession with several ids', () => {
  it('removes both directions of a deleted word at once', () => {
    const session: SessionState = {
      queue: [
        { id: 'word:a:recognise', kind: 'new', reinforcement: false },
        { id: 'word:a:produce', kind: 'new', reinforcement: false },
        { id: 'word:b:recognise', kind: 'review', reinforcement: false },
      ],
      reinforcementCounts: {},
      lapses: {},
      completed: [],
    }

    const after = dropFromSession(session, 'word:a:recognise', 'word:a:produce')
    expect(after.queue.map((entry) => entry.id)).toEqual(['word:b:recognise'])
  })
})

describe('priority', () => {
  it('leaves the normal ladder exactly as it was', () => {
    expect(nextInterval(0, 'got', 0)).toBe(1)
    expect(nextInterval(1, 'got', 0)).toBe(2)
    expect(nextInterval(2, 'got', 0)).toBe(4)
    expect(nextInterval(4, 'got', 0)).toBe(8)
  })

  it('brings a focused card back twice as soon', () => {
    expect(nextInterval(4, 'got', 1)).toBe(4)
    expect(nextInterval(8, 'got', 1)).toBe(8)
  })

  it('pushes a de-prioritised card out twice as far', () => {
    expect(nextInterval(4, 'got', -1)).toBe(16)
  })

  it('never lets a focused card drift out of circulation', () => {
    expect(nextInterval(90, 'got', 1)).toBe(21)
  })

  it('still caps everything else at the ordinary ceiling', () => {
    expect(nextInterval(120, 'got', -1)).toBe(MAX_INTERVAL_DAYS)
  })

  it('never rounds an interval down to nothing, which would read as a miss', () => {
    expect(nextInterval(1, 'got', 1)).toBe(1)
  })

  it('resets on a miss whatever the priority', () => {
    for (const priority of [-1, 0, 1] as const) {
      expect(nextInterval(16, 'missed', priority)).toBe(0)
    }
  })

  it('reads a stored value into a level, tolerating null', () => {
    expect(toPriority(null)).toBe(0)
    expect(toPriority(undefined)).toBe(0)
    expect(toPriority(5)).toBe(1)
    expect(toPriority(-3)).toBe(-1)
  })
})

/**
 * The complaint these fix: a missed card came back once, at the very end of
 * the queue, and left the sitting the moment it was answered right — which
 * after being shown the answer proves nothing. By the next session the
 * mistake had set.
 */
const due = state({ intervalDays: 2, reps: 2, dueAt: addDays(NOW, -1) })

/** Answers correctly until `id` is at the front. Bounded: a test that hangs
 *  when behaviour changes is worse than one that fails. */
function advanceTo(session: SessionState, id: string): SessionState {
  let current = session
  for (let step = 0; step < 200; step++) {
    if (current.queue[0]?.id === id) return current
    if (current.queue.length === 0) break
    current = gradeCurrent(current, 'got', due, NOW).session
  }
  throw new Error(`${id} never came back to the front of the queue`)
}

describe('recovering from a miss inside one sitting', () => {
  function deck(ids: string[]) {
    return buildSession(
      ids.map((id) => ({ id, state: due })),
      NOW,
      { rng: keepOrder },
    )
  }

  it('brings a missed card back a few cards later, not immediately', () => {
    const session = deck(['a', 'b', 'c', 'd', 'e', 'f'])
    const after = gradeCurrent(session, 'missed', due, NOW).session

    // Not the very next card — that tests the last ten seconds, not memory.
    expect(after.queue[0].id).not.toBe('a')
    expect(after.queue[LAPSE_GAPS[0]].id).toBe('a')
  })

  it('does not put it at the end of the queue, where it used to go', () => {
    const session = deck(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])
    const after = gradeCurrent(session, 'missed', due, NOW).session

    expect(after.queue[after.queue.length - 1].id).not.toBe('a')
  })

  it('keeps showing it while it is still being missed', () => {
    let session = deck(['a', 'b', 'c', 'd', 'e'])

    for (let i = 0; i < 3; i++) {
      session = gradeCurrent(session, 'missed', due, NOW).session
      // Still queued, every time.
      expect(session.queue.some((entry) => entry.id === 'a')).toBe(true)
      // Walk the queue forward to the next showing of it.
      session = advanceTo(session, 'a')
    }
  })

  it('does not let one correct answer end it', () => {
    let session = deck(['a', 'b', 'c', 'd', 'e', 'f'])
    session = gradeCurrent(session, 'missed', due, NOW).session

    session = advanceTo(session, 'a')
    session = gradeCurrent(session, 'got', due, NOW).session

    // One clean recall is not enough: it is still owed another, further out.
    expect(session.queue.some((entry) => entry.id === 'a')).toBe(true)
    expect(session.completed).not.toContain('a')
  })

  it('lets it go after two clean recalls at widening gaps', () => {
    let session = deck(['a', 'b', 'c', 'd', 'e', 'f'])
    session = gradeCurrent(session, 'missed', due, NOW).session

    for (let recalls = 0; recalls < LAPSE_RECALLS_REQUIRED; recalls++) {
      session = advanceTo(session, 'a')
      session = gradeCurrent(session, 'got', due, NOW).session
    }

    expect(session.lapses['a']).toBeUndefined()
    expect(session.completed).toContain('a')
  })

  it('widens the gap after each clean recall', () => {
    let session = deck(Array.from({ length: 30 }, (_, i) => `w${i}`))
    session = gradeCurrent(session, 'missed', due, NOW).session
    const first = session.queue.findIndex((entry) => entry.id === 'w0')

    session = advanceTo(session, 'w0')
    session = gradeCurrent(session, 'got', due, NOW).session
    const second = session.queue.findIndex((entry) => entry.id === 'w0')

    expect(second).toBeGreaterThan(first)
  })

  it('a miss after a recovery starts the recovery over', () => {
    let session = deck(['a', 'b', 'c', 'd', 'e', 'f'])
    session = gradeCurrent(session, 'missed', due, NOW).session

    session = advanceTo(session, 'a')
    session = gradeCurrent(session, 'got', due, NOW).session
    session = advanceTo(session, 'a')
    session = gradeCurrent(session, 'missed', due, NOW).session

    expect(session.lapses['a'].streak).toBe(0)
    expect(session.lapses['a'].misses).toBe(2)
  })

  it('still reschedules the card properly on the miss itself', () => {
    const session = deck(['a', 'b', 'c'])
    const result = gradeCurrent(session, 'missed', { ...due, intervalDays: 8 }, NOW)

    expect(result.scheduling?.after.intervalDays).toBe(0)
    expect(result.scheduling?.after.lapses).toBe(1)
  })

  it('does not reschedule the in-sitting repeats', () => {
    let session = deck(['a', 'b', 'c', 'd', 'e'])
    session = gradeCurrent(session, 'missed', due, NOW).session

    session = advanceTo(session, 'a')

    // The repeat is a reinforcement showing: logged, but it must not move the
    // due date on the strength of a recall from ninety seconds ago.
    expect(gradeCurrent(session, 'got', due, NOW).scheduling).toBeNull()
  })
})

describe('the other direction follows a miss', () => {
  it('pulls the sibling card in close behind', () => {
    const session = buildSession(
      ['word:x:recognise', 'b', 'c', 'd', 'e', 'f', 'g', 'word:x:produce'].map((id) => ({
        id,
        state: due,
      })),
      NOW,
      { rng: keepOrder },
    )

    const after = gradeCurrent(session, 'missed', due, NOW, {
      sibling: 'word:x:produce',
    }).session

    const siblingAt = after.queue.findIndex((entry) => entry.id === 'word:x:produce')
    expect(siblingAt).toBeLessThanOrEqual(LAPSE_GAPS[0] + 2)
  })

  it('moves the sibling rather than duplicating it', () => {
    const session = buildSession(
      ['word:x:recognise', 'b', 'c', 'd', 'word:x:produce'].map((id) => ({
        id,
        state: due,
      })),
      NOW,
      { rng: keepOrder },
    )

    const after = gradeCurrent(session, 'missed', due, NOW, {
      sibling: 'word:x:produce',
    }).session

    expect(after.queue.filter((entry) => entry.id === 'word:x:produce')).toHaveLength(1)
  })

  it('leaves the queue alone when there is no sibling to pull in', () => {
    const session = buildSession(
      ['a', 'b', 'c'].map((id) => ({ id, state: due })),
      NOW,
      { rng: keepOrder },
    )

    const after = gradeCurrent(session, 'missed', due, NOW, { sibling: null }).session
    expect(after.queue.map((entry) => entry.id)).toEqual(['b', 'c', 'a'])
  })

  it('never pulls in the card being graded as its own sibling', () => {
    const session = buildSession([{ id: 'a', state: due }], NOW, { rng: keepOrder })
    const after = gradeCurrent(session, 'missed', due, NOW, { sibling: 'a' }).session

    expect(after.queue).toHaveLength(1)
  })
})

/**
 * A topic sitting revises the topic's words and only then tries the sentences
 * built out of them, so the words are fresh when the sentence asks for them.
 */
describe('buildSession stages', () => {
  const now = new Date('2026-10-26T00:00:00.000Z')
  const unseen = { intervalDays: 0, dueAt: now, reps: 0, lapses: 0 }
  const seen = { intervalDays: 2, dueAt: now, reps: 4, lapses: 0 }

  it('puts every word ahead of every sentence', () => {
    const session = buildSession(
      [
        { id: 's1', state: unseen, stage: 1 },
        { id: 'w1', state: unseen, stage: 0 },
        { id: 's2', state: unseen, stage: 1 },
        { id: 'w2', state: unseen, stage: 0 },
      ],
      now,
      { maxNew: Number.POSITIVE_INFINITY },
    )

    const ids = session.queue.map((entry) => entry.id)
    const lastWord = Math.max(ids.indexOf('w1'), ids.indexOf('w2'))
    const firstSentence = Math.min(ids.indexOf('s1'), ids.indexOf('s2'))
    expect(lastWord).toBeLessThan(firstSentence)
  })

  it('still does reviews before new material inside a stage', () => {
    const session = buildSession(
      [
        { id: 'new', state: unseen, stage: 0 },
        { id: 'review', state: seen, stage: 0 },
      ],
      now,
      { maxNew: Number.POSITIVE_INFINITY },
    )
    expect(session.queue.map((e) => e.id)).toEqual(['review', 'new'])
  })

  /**
   * The cap is per stage. Shared, a topic's words could spend all of it and
   * leave its sentences — the point of the sitting — out of the queue.
   */
  it('gives each stage its own allowance of new cards', () => {
    const session = buildSession(
      [
        { id: 'w1', state: unseen, stage: 0 },
        { id: 'w2', state: unseen, stage: 0 },
        { id: 's1', state: unseen, stage: 1 },
      ],
      now,
      { maxNew: 2 },
    )
    expect(session.queue.map((e) => e.id).sort()).toEqual(['s1', 'w1', 'w2'])
  })

  it('behaves exactly as before when nothing carries a stage', () => {
    const session = buildSession(
      [
        { id: 'a', state: seen },
        { id: 'b', state: unseen },
      ],
      now,
      { maxNew: Number.POSITIVE_INFINITY },
    )
    expect(session.queue.map((e) => e.id)).toEqual(['a', 'b'])
  })
})

/**
 * Practising one topic straight through feels better and is remembered worse:
 * the answer is still in mind from the last card, so nothing is really being
 * recalled. These check the session alternates between topics in blocks.
 */
describe('buildSession interleaving', () => {
  const now = new Date('2026-10-26T00:00:00.000Z')
  const seen = { intervalDays: 2, dueAt: now, reps: 4, lapses: 0 }
  const unseen = { intervalDays: 0, dueAt: now, reps: 0, lapses: 0 }

  function lanesOf(ids: string[]): string[] {
    return ids.map((id) => id.split('-')[0])
  }

  it('alternates topics instead of running one to the end', () => {
    const items = [
      ...Array.from({ length: 12 }, (_, i) => ({ id: `a-${i}`, state: seen, lane: 'a' })),
      ...Array.from({ length: 12 }, (_, i) => ({ id: `b-${i}`, state: seen, lane: 'b' })),
    ]
    const session = buildSession(items, now, {
      maxNew: Number.POSITIVE_INFINITY,
      blockSize: 6,
    })

    const lanes = lanesOf(session.queue.map((e) => e.id))
    // Two topics, twelve cards each, six to a block: a b a b.
    expect(lanes.slice(0, 6).every((l) => l === lanes[0])).toBe(true)
    expect(lanes[6]).not.toBe(lanes[0])
    expect(new Set(lanes).size).toBe(2)
    expect(lanes).toHaveLength(24)
  })

  it('keeps a block together rather than switching every card', () => {
    const items = [
      ...Array.from({ length: 6 }, (_, i) => ({ id: `a-${i}`, state: seen, lane: 'a' })),
      ...Array.from({ length: 6 }, (_, i) => ({ id: `b-${i}`, state: seen, lane: 'b' })),
    ]
    const lanes = lanesOf(
      buildSession(items, now, { maxNew: Number.POSITIVE_INFINITY, blockSize: 3 }).queue.map(
        (e) => e.id,
      ),
    )
    // Four runs of three, never a run of one.
    let runs = 1
    for (let i = 1; i < lanes.length; i++) if (lanes[i] !== lanes[i - 1]) runs++
    expect(runs).toBe(4)
  })

  it('carries on when a short topic runs out', () => {
    const items = [
      { id: 'a-0', state: seen, lane: 'a' },
      ...Array.from({ length: 10 }, (_, i) => ({ id: `b-${i}`, state: seen, lane: 'b' })),
    ]
    const session = buildSession(items, now, {
      maxNew: Number.POSITIVE_INFINITY,
      blockSize: 3,
    })
    expect(session.queue).toHaveLength(11)
  })

  it('does not interleave when everything is one topic', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ id: `a-${i}`, state: seen, lane: 'a' }))
    expect(buildSession(items, now, { maxNew: Number.POSITIVE_INFINITY }).queue).toHaveLength(5)
  })

  /**
   * One topic's new words must not spend the whole allowance, or the other
   * topics in the sitting never appear at all.
   */
  it('gives each topic its own allowance of first-time cards', () => {
    const items = [
      ...Array.from({ length: 10 }, (_, i) => ({ id: `a-${i}`, state: unseen, lane: 'a' })),
      ...Array.from({ length: 10 }, (_, i) => ({ id: `b-${i}`, state: unseen, lane: 'b' })),
    ]
    const lanes = lanesOf(buildSession(items, now, { maxNew: 3 }).queue.map((e) => e.id))
    expect(lanes.filter((l) => l === 'a')).toHaveLength(3)
    expect(lanes.filter((l) => l === 'b')).toHaveLength(3)
  })

  it('still puts words ahead of sentences across topics', () => {
    const items = [
      { id: 'a-w', state: seen, lane: 'a', stage: 0 },
      { id: 'b-w', state: seen, lane: 'b', stage: 0 },
      { id: 'a-s', state: seen, lane: 'a', stage: 1 },
      { id: 'b-s', state: seen, lane: 'b', stage: 1 },
    ]
    const ids = buildSession(items, now, { maxNew: Number.POSITIVE_INFINITY }).queue.map(
      (e) => e.id,
    )
    expect(ids.slice(0, 2).sort()).toEqual(['a-w', 'b-w'])
    expect(ids.slice(2).sort()).toEqual(['a-s', 'b-s'])
  })
})
