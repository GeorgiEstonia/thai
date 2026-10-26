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

/** Stops a first-showing card from looping forever inside one session. */
export const MAX_REINFORCEMENTS_PER_ITEM = 3

/**
 * How soon a missed card comes back, and how far apart after that.
 *
 * Three cards later, then eight, then twenty. Not immediately: answering a
 * card you were just told the answer to tests the last ten seconds of memory,
 * not retention, and it feels like progress while teaching nothing. Three
 * cards is far enough that you have to actually retrieve it again and near
 * enough that you have not yet lost it.
 *
 * The gaps widen because that is the whole mechanism — each clean recall at a
 * longer gap is better evidence than the one before it.
 */
export const LAPSE_GAPS = [3, 8, 20]

/**
 * Clean recalls needed before a missed card is done for the sitting.
 *
 * Two, at widening gaps. One is the problem being fixed: getting it right
 * once straight after being told the answer proves nothing, and the card was
 * then put away until tomorrow — by which time the mistake has set.
 */
export const LAPSE_RECALLS_REQUIRED = 2

/**
 * A ceiling on how many times one card can come back in a sitting.
 *
 * A word you simply cannot get right today should not be able to take the
 * session hostage. When this is hit the card is left alone: it was reset to
 * due-immediately when missed, so it leads tomorrow's session anyway.
 */
export const MAX_LAPSE_SHOWINGS = 6

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

/** What a card that was missed this sitting still owes before it is done. */
export interface LapseState {
  misses: number
  /** Clean recalls since the last miss. */
  streak: number
  /** Times it has been put back in the queue, so it cannot loop forever. */
  showings: number
}

export interface SessionState {
  queue: SessionEntry[]
  reinforcementCounts: Record<string, number>
  /** Cards missed this sitting, keyed by card id, until they are recovered. */
  lapses: Record<string, LapseState>
  /** Ids that have left the queue, in the order they were finished. */
  completed: string[]
}

export interface SessionItem {
  id: string
  state: SrsState
  /**
   * Which stage of the sitting this belongs to. Lower goes first, and the
   * shuffle happens inside a stage rather than across them.
   *
   * This is what lets a topic session revise the words of a topic and only
   * then try its sentences, which is the order the sentences were built for:
   * a sentence is practice at putting known words together, so meeting its
   * words a minute earlier is most of the value.
   *
   * Defaults to 0, which is one stage and the behaviour everything else has.
   */
  stage?: number
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
 * new material so you clear existing debt before taking on more — and, where
 * items carry a stage, stage by stage so words come round before the
 * sentences built out of them.
 */
export function buildSession(
  items: SessionItem[],
  now: Date,
  options: BuildSessionOptions = {},
): SessionState {
  const { maxNew = 8, rng = Math.random } = options

  const due = items.filter((item) => isDue(item.state, now))

  // The new-card cap is per stage, not per sitting. Sharing one budget would
  // let a topic's words use it all up and leave its sentences — the point of
  // the session — out of the queue entirely.
  const stages = [...new Set(due.map((item) => item.stage ?? 0))].sort((a, b) => a - b)

  const queue: SessionEntry[] = stages.flatMap((stage) => {
    const inStage = due.filter((item) => (item.stage ?? 0) === stage)
    const reviews = inStage.filter((item) => item.state.reps > 0)
    const fresh = inStage.filter((item) => item.state.reps === 0).slice(0, maxNew)

    return [
      ...shuffle(reviews, rng).map(
        (item): SessionEntry => ({ id: item.id, kind: 'review' as const, reinforcement: false }),
      ),
      ...shuffle(fresh, rng).map(
        (item): SessionEntry => ({ id: item.id, kind: 'new' as const, reinforcement: false }),
      ),
    ]
  })

  return { queue, reinforcementCounts: {}, lapses: {}, completed: [] }
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

/** Puts an entry `gap` cards further on, or at the end if the queue is short. */
function insertAt(queue: SessionEntry[], gap: number, entry: SessionEntry): SessionEntry[] {
  const next = [...queue]
  next.splice(Math.min(gap, next.length), 0, entry)
  return next
}

export interface GradeOptions {
  priority?: Priority
  /**
   * The same item practised the other way round, if this deck has it.
   *
   * Reading a word and producing it are scheduled apart because they are
   * different skills — but when one of them breaks, the other is the most
   * useful thing you can be shown next. Getting ข้าว → "rice" wrong and then
   * being asked for "rice" → ข้าว a few cards later attacks the same gap from
   * the other side while it is still open.
   */
  sibling?: string | null
}

/**
 * Grades the entry at the front of the queue.
 *
 * `state` is the item's current schedule, supplied by the caller — this module
 * deliberately owns no storage.
 *
 * A missed card does not leave the sitting when you next get it right. It
 * comes back three cards later, then eight, then twenty, and only leaves after
 * two clean recalls — because one correct answer straight after being shown
 * the answer is not evidence of anything.
 */
export function gradeCurrent(
  session: SessionState,
  grade: Grade,
  state: SrsState,
  now: Date,
  options: GradeOptions = {},
): GradeResult {
  const entry = currentEntry(session)
  if (!entry) return { session, scheduling: null }

  const { priority = 0, sibling = null } = options

  let queue = session.queue.slice(1)
  const reinforcementCounts = { ...session.reinforcementCounts }
  const lapses = { ...session.lapses }
  const completed = [...session.completed]

  const lapse = lapses[entry.id]
  const repeat: SessionEntry = { id: entry.id, kind: entry.kind, reinforcement: true }

  if (grade === 'missed') {
    const next: LapseState = {
      misses: (lapse?.misses ?? 0) + 1,
      streak: 0,
      showings: (lapse?.showings ?? 0) + 1,
    }

    if (next.showings <= MAX_LAPSE_SHOWINGS) {
      queue = insertAt(queue, LAPSE_GAPS[0], repeat)
      lapses[entry.id] = next
    } else {
      // Enough for one sitting. It is due immediately either way.
      delete lapses[entry.id]
      completed.push(entry.id)
    }

    // Bring the other direction alongside it, wherever it currently sits.
    if (sibling && sibling !== entry.id) {
      const existing = queue.find((queued) => queued.id === sibling)
      queue = queue.filter((queued) => queued.id !== sibling)
      queue = insertAt(queue, LAPSE_GAPS[0] + 2, existing ?? { id: sibling, kind: 'review', reinforcement: true })
    }
  } else if (lapse) {
    // Recovering from a miss: prove it at a longer gap before it is done.
    const streak = lapse.streak + 1

    if (streak >= LAPSE_RECALLS_REQUIRED || lapse.showings >= MAX_LAPSE_SHOWINGS) {
      delete lapses[entry.id]
      completed.push(entry.id)
    } else {
      queue = insertAt(queue, LAPSE_GAPS[Math.min(streak, LAPSE_GAPS.length - 1)], repeat)
      lapses[entry.id] = { ...lapse, streak, showings: lapse.showings + 1 }
    }
  } else if (!entry.reinforcement && entry.kind === 'new') {
    // A card's first ever showing gets one unscheduled repeat later on.
    const seen = reinforcementCounts[entry.id] ?? 0
    if (seen < MAX_REINFORCEMENTS_PER_ITEM) {
      queue.push(repeat)
      reinforcementCounts[entry.id] = seen + 1
    } else {
      completed.push(entry.id)
    }
  } else {
    completed.push(entry.id)
  }

  return {
    session: { queue, reinforcementCounts, lapses, completed },
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

  const lapses = Object.fromEntries(
    Object.entries(session.lapses).filter(([id]) => !dropped.has(id)),
  )

  return {
    queue: session.queue.filter((entry) => !dropped.has(entry.id)),
    reinforcementCounts,
    lapses,
    completed: session.completed.filter((id) => !dropped.has(id)),
  }
}
