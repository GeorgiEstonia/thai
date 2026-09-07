/**
 * Spaced repetition engine.
 *
 * Pure functions only — no database, no React, no clock reads that aren't
 * passed in. Both the character deck and the vocabulary deck use this.
 *
 * Scheduling is plain interval doubling with two-button self-grading:
 *
 *   Got it     interval 0 -> 1 -> 2 -> 4 -> 8 ... capped at 180 days
 *   Missed it  interval -> 0, lapse recorded, due immediately
 *
 * Separately from scheduling, a session keeps a queue so that a missed card
 * comes back later in the same sitting rather than immediately (an immediate
 * re-show tests your short-term memory, not your retention), and a card seen
 * for the first time gets one reinforcement showing before the session ends.
 * Those in-session repeats are marked `reinforcement` and deliberately do not
 * touch the schedule — otherwise a new card would jump to a 2-day interval on
 * the strength of a recall you did ten seconds ago.
 */

export const MAX_INTERVAL_DAYS = 180

/** A character counts as mastered once it survives three correct recalls (1 -> 2 -> 4). */
export const MASTERY_INTERVAL_DAYS = 4

/** Cards you keep forgetting get surfaced for attention, not auto-suspended. */
export const LEECH_LAPSE_THRESHOLD = 4

/** Stops a repeatedly-missed card from looping forever inside one session. */
export const MAX_REINFORCEMENTS_PER_ITEM = 3

const MS_PER_DAY = 86_400_000

export type Grade = 'got' | 'missed'

export interface SrsState {
  /** 0 means new or just-lapsed. */
  intervalDays: number
  dueAt: Date
  reps: number
  lapses: number
}

export function newState(now: Date): SrsState {
  return { intervalDays: 0, dueAt: now, reps: 0, lapses: 0 }
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * MS_PER_DAY)
}

/**
 * How often you asked to see a card: 1 more than usual, -1 less, 0 normal.
 *
 * A level rather than a nudge. A nudge that shifts the schedule a little each
 * time it is tapped compounds invisibly — three taps over three weeks and you
 * can no longer tell what you did or undo it. A level is shown on the card,
 * set with one tap, and cleared with another.
 */
export type Priority = -1 | 0 | 1

/** A word you want more of comes back twice as soon; one you want less of,
 *  twice as late. Applied to the result, so the doubling ladder is intact and
 *  only its spacing shifts. */
const PRIORITY_FACTOR: Record<Priority, number> = { 1: 0.5, 0: 1, [-1]: 2 }

/** A card you asked to see more of should stay in circulation rather than
 *  drifting out to six months like everything else. */
const FOCUS_MAX_INTERVAL_DAYS = 21

export function toPriority(value: number | undefined | null): Priority {
  if (value === undefined || value === null) return 0
  return value > 0 ? 1 : value < 0 ? -1 : 0
}

export function nextInterval(current: number, grade: Grade, priority: Priority = 0): number {
  if (grade === 'missed') return 0
  if (current <= 0) return 1

  const doubled = current * 2
  const adjusted = Math.round(doubled * PRIORITY_FACTOR[priority])
  const ceiling = priority === 1 ? FOCUS_MAX_INTERVAL_DAYS : MAX_INTERVAL_DAYS

  // Never below a day: the interval is in whole days, and rounding a short
  // interval down to zero would read as a miss.
  return Math.min(Math.max(adjusted, 1), ceiling)
}

export function applyGrade(
  state: SrsState,
  grade: Grade,
  now: Date,
  priority: Priority = 0,
): SrsState {
  const intervalDays = nextInterval(state.intervalDays, grade, priority)
  return {
    intervalDays,
    // A missed card is due again right away; the session queue is what stops
    // it reappearing on the very next screen.
    dueAt: intervalDays === 0 ? now : addDays(now, intervalDays),
    reps: state.reps + 1,
    lapses: state.lapses + (grade === 'missed' ? 1 : 0),
  }
}

export function isDue(state: SrsState, now: Date): boolean {
  return state.dueAt.getTime() <= now.getTime()
}

export function isLeech(state: SrsState): boolean {
  return state.lapses >= LEECH_LAPSE_THRESHOLD
}

export function isMastered(state: SrsState): boolean {
  return state.intervalDays >= MASTERY_INTERVAL_DAYS
}

// ---------------------------------------------------------------------------
// Batch gating
// ---------------------------------------------------------------------------

/**
 * A batch is mastered when every character in it has reached the mastery
 * interval. An empty batch is never mastered — that would silently unlock
 * everything downstream if content were missing.
 */
export function isBatchMastered(states: SrsState[]): boolean {
  return states.length > 0 && states.every(isMastered)
}

/** How many characters in a batch still need to reach the gate. */
export function gateDistance(states: SrsState[], batchSize: number): number {
  const mastered = states.filter(isMastered).length
  return Math.max(batchSize - mastered, 0)
}

/**
 * Batch 1 is always available. Each later batch unlocks only once the batch
 * before it is fully mastered, so new load is never added on top of shaky
 * material.
 */
export function unlockedBatches(
  batches: number[],
  statesByBatch: Map<number, SrsState[]>,
): number[] {
  const ordered = [...batches].sort((a, b) => a - b)
  const unlocked: number[] = []

  for (const batch of ordered) {
    unlocked.push(batch)
    if (!isBatchMastered(statesByBatch.get(batch) ?? [])) break
  }

  return unlocked
}

// ---------------------------------------------------------------------------
// Session queue
// ---------------------------------------------------------------------------

export interface SessionEntry {
  id: string
  /** 'new' items have never been graded before this session. */
  kind: 'new' | 'review'
  /** An in-session repeat: shown again for reinforcement, does not reschedule. */
  reinforcement: boolean
}

export interface SessionState {
  queue: SessionEntry[]
  reinforcementCounts: Record<string, number>
  /** Ids that have left the queue, in the order they were finished. */
  completed: string[]
}

export interface SessionItem {
  id: string
  state: SrsState
}

export interface BuildSessionOptions {
  /** Cap on first-time items so an unlocking batch doesn't flood one sitting. */
  maxNew?: number
  /** Injectable for deterministic tests. */
  rng?: () => number
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Builds the queue for one sitting: everything currently due, reviews before
 * new material so you clear existing debt before taking on more.
 */
export function buildSession(
  items: SessionItem[],
  now: Date,
  options: BuildSessionOptions = {},
): SessionState {
  const { maxNew = 8, rng = Math.random } = options

  const due = items.filter((item) => isDue(item.state, now))
  const reviews = due.filter((item) => item.state.reps > 0)
  const fresh = due.filter((item) => item.state.reps === 0).slice(0, maxNew)

  const queue: SessionEntry[] = [
    ...shuffle(reviews, rng).map(
      (item): SessionEntry => ({ id: item.id, kind: 'review', reinforcement: false }),
    ),
    ...shuffle(fresh, rng).map(
      (item): SessionEntry => ({ id: item.id, kind: 'new', reinforcement: false }),
    ),
  ]

  return { queue, reinforcementCounts: {}, completed: [] }
}

export function currentEntry(session: SessionState): SessionEntry | null {
  return session.queue[0] ?? null
}

export interface GradeResult {
  session: SessionState
  /**
   * The schedule change to persist, or null when this was a reinforcement
   * showing (which is logged but must not move the card's due date).
   */
  scheduling: { id: string; before: SrsState; after: SrsState } | null
}

/**
 * Grades the entry at the front of the queue.
 *
 * `state` is the item's current schedule, supplied by the caller — this module
 * deliberately owns no storage.
 */
export function gradeCurrent(
  session: SessionState,
  grade: Grade,
  state: SrsState,
  now: Date,
  priority: Priority = 0,
): GradeResult {
  const entry = currentEntry(session)
  if (!entry) return { session, scheduling: null }

  const rest = session.queue.slice(1)
  const seen = session.reinforcementCounts[entry.id] ?? 0

  // Come back later in this sitting if it was missed, or if this was the first
  // time the item has ever been shown.
  const wantsRepeat = grade === 'missed' || (!entry.reinforcement && entry.kind === 'new')
  const canRepeat = seen < MAX_REINFORCEMENTS_PER_ITEM

  const queue = [...rest]
  const reinforcementCounts = { ...session.reinforcementCounts }
  const completed = [...session.completed]

  if (wantsRepeat && canRepeat) {
    queue.push({ id: entry.id, kind: entry.kind, reinforcement: true })
    reinforcementCounts[entry.id] = seen + 1
  } else {
    completed.push(entry.id)
  }

  return {
    session: { queue, reinforcementCounts, completed },
    scheduling: entry.reinforcement
      ? null
      : { id: entry.id, before: state, after: applyGrade(state, grade, now, priority) },
  }
}

/**
 * Takes one or more items out of the session entirely.
 *
 * For a card deleted mid-drill. Every entry for that item goes, not just the
 * one in front, because a card that was missed or is new is queued to come
 * back later in the sitting — and a deleted card returning would be a card
 * asking about a word that no longer exists. It takes several ids because
 * deleting a word kills both of its directions, not only the one on screen.
 *
 * It is not added to `completed`: nothing was answered, so there is nothing to
 * report in the summary.
 */
export function dropFromSession(session: SessionState, ...ids: string[]): SessionState {
  const dropped = new Set(ids)

  const reinforcementCounts = Object.fromEntries(
    Object.entries(session.reinforcementCounts).filter(([id]) => !dropped.has(id)),
  )

  return {
    queue: session.queue.filter((entry) => !dropped.has(entry.id)),
    reinforcementCounts,
    completed: session.completed.filter((id) => !dropped.has(id)),
  }
}
