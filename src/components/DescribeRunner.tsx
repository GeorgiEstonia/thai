'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Starts the example-writing job and reports how it is getting on.
 *
 * It used to drive the work too, looping requests for as long as the page was
 * open — which meant a deck-wide rewrite took the tab staying open for the
 * duration, and closing it half way left the rest for another day. The server
 * chains the batches itself now, so this kicks the job once and then only
 * watches: close the tab and the work carries on without you.
 *
 * Watching still has a job to do. A chain link can be lost to a cold start or
 * a killed function, and nothing server-side is left to notice. So a count
 * that stops moving is nudged — the chain's claim on the job expires on its
 * own, which is what makes a nudge safe rather than a way to start a second
 * worker on the same backlog.
 */

const POLL_MS = 5000
/** Polls without progress before assuming the chain died. Covers a slow batch. */
const STALLED_POLLS = 6

export default function DescribeRunner() {
  const [remaining, setRemaining] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  // Refs, not state: these drive the loop and must not restart it when they
  // change. Re-running this effect is what starts duplicate work.
  const lastSeen = useRef<number | null>(null)
  const stalled = useRef(0)

  useEffect(() => {
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined

    /** Asks the server to start, or to pick up a chain that went quiet. */
    const kick = async () => {
      try {
        const response = await fetch('/api/describe', { method: 'POST' })
        if (!response.ok) {
          if (live) setFailed(true)
          return
        }
        const { remaining: left } = (await response.json()) as { remaining: number }
        if (live) setRemaining(left)
      } catch {
        if (live) setFailed(true)
      }
    }

    const poll = async () => {
      try {
        const response = await fetch('/api/describe')
        if (!response.ok) return
        const { remaining: left } = (await response.json()) as { remaining: number }
        if (!live) return

        setRemaining(left)
        if (left === 0) return

        if (left === lastSeen.current) stalled.current += 1
        else stalled.current = 0
        lastSeen.current = left

        if (stalled.current >= STALLED_POLLS) {
          stalled.current = 0
          await kick()
        }

        timer = setTimeout(() => void poll(), POLL_MS)
      } catch {
        // A failed poll says nothing about the work, which is server-side.
        // Keep watching rather than declaring it broken.
        if (live) timer = setTimeout(() => void poll(), POLL_MS)
      }
    }

    void (async () => {
      try {
        const response = await fetch('/api/describe')
        const { remaining: left } = response.ok
          ? ((await response.json()) as { remaining: number })
          : { remaining: 0 }
        if (!live) return
        setRemaining(left)
        if (left === 0) return

        lastSeen.current = left
        await kick()
        if (live) timer = setTimeout(() => void poll(), POLL_MS)
      } catch {
        // Nothing to report: the count is unknown, so show nothing.
      }
    })()

    return () => {
      live = false
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (remaining === null || remaining === 0) return null

  return (
    <p className="mt-4 rounded-xl bg-surface px-3 py-3 text-xs leading-relaxed text-muted">
      {failed ? (
        <>Could not write examples just now. Reload and it will carry on.</>
      ) : (
        <>
          Writing usage examples — {remaining} to go. This carries on if you close the app; they
          appear on the back of each card as they are written.
        </>
      )}
    </p>
  )
}
