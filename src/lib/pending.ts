import type { Direction, ItemType } from '@/content/items'
import type { Grade } from '@/lib/srs'

/**
 * Grades that haven't reached the server yet.
 *
 * A drill answers in under a second and the save happens behind it, so a
 * failed save used to mean the answer was simply gone — and the only sign was
 * a line of red text you'd already scrolled past. Losing a session's work to a
 * dropped request, a cold start, or a browser holding a stale build is the one
 * failure this app cannot afford: the schedule is the whole product.
 *
 * So a grade that fails goes here, in localStorage, and is retried on the next
 * grade and on the next visit. It survives a reload, which matters because a
 * reload is exactly what fixes the most likely cause.
 */

const KEY = 'thai.pendingGrades'

/** Beyond this the backlog is stale enough that replaying it would do more
 *  harm than good — intervals would jump on answers given days ago. */
const MAX_PENDING = 200

export interface PendingGrade {
  itemType: ItemType
  itemId: string
  direction: Direction
  grade: Grade
  reinforcement: boolean
  /** When it was actually answered, for the record. */
  at: number
}

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    // Private mode, or a browser configured to refuse site data.
    return null
  }
}

export function readPending(): PendingGrade[] {
  const store = storage()
  if (!store) return []
  try {
    const raw = store.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PendingGrade[]) : []
  } catch {
    return []
  }
}

function write(queue: PendingGrade[]): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(KEY, JSON.stringify(queue.slice(-MAX_PENDING)))
  } catch {
    // Quota, or storage refused. Nothing useful to do here.
  }
}

export function enqueue(grade: PendingGrade): void {
  write([...readPending(), grade])
}

export function clearPending(): void {
  const store = storage()
  if (!store) return
  try {
    store.removeItem(KEY)
  } catch {
    // Ignore.
  }
}

/**
 * Retries the backlog, oldest first, and keeps whatever still fails.
 *
 * Stops at the first failure rather than working through the rest: if the
 * server is refusing one, it will refuse the others, and hammering it changes
 * nothing. Returns how many are still outstanding.
 */
export async function flushPending(
  send: (grade: PendingGrade) => Promise<void>,
): Promise<number> {
  const queue = readPending()
  if (queue.length === 0) return 0

  let index = 0
  for (; index < queue.length; index++) {
    try {
      await send(queue[index])
    } catch {
      break
    }
  }

  const remaining = queue.slice(index)
  if (remaining.length === 0) clearPending()
  else write(remaining)

  return remaining.length
}
