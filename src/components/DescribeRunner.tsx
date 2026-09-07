'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Works through vocabulary that has no example yet, in the background.
 *
 * Driven from the browser rather than the server on purpose: there is nothing
 * on a serverless platform that keeps running after a response, so a job that
 * has to make two hundred model calls needs something to keep asking. The page
 * you have open is that something. Each request saves what it wrote, so
 * closing the tab pauses the work rather than losing it, and opening the app
 * again picks up where it stopped.
 */
export default function DescribeRunner() {
  const [remaining, setRemaining] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  const running = useRef(false)

  const run = useCallback(async () => {
    if (running.current) return
    running.current = true

    try {
      for (;;) {
        const response = await fetch('/api/describe', { method: 'POST' })
        if (!response.ok) {
          setFailed(true)
          break
        }
        const { remaining: left } = (await response.json()) as { remaining: number }
        setRemaining(left)
        if (left === 0) break
      }
    } catch {
      setFailed(true)
    } finally {
      running.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void fetch('/api/describe')
      .then((response) => (response.ok ? response.json() : { remaining: 0 }))
      .then(({ remaining: left }: { remaining: number }) => {
        if (cancelled) return
        setRemaining(left)
        if (left > 0) void run()
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [run])

  if (remaining === null || remaining === 0) return null

  return (
    <p className="mt-4 rounded-xl bg-surface px-3 py-3 text-xs leading-relaxed text-muted">
      {failed ? (
        <>Could not write examples just now. Reload and it will carry on.</>
      ) : (
        <>
          Writing usage examples — {remaining} to go. They appear on the back of each card as
          they are written; you can keep practising meanwhile.
        </>
      )}
    </p>
  )
}
