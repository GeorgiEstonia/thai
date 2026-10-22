'use client'

import { useEffect, useRef, useState } from 'react'

interface Applied {
  id: string
  pack: string
  added: number
  alreadyHad: number
}

/**
 * Files vocabulary that shipped with the app, on sight.
 *
 * Runs itself rather than waiting to be asked. The alternative was handing
 * over eight blocks of text to paste in by hand, which is a chore invented by
 * the app's own inability to be written to from outside — not work that was
 * ever yours to do.
 */
export default function SeedRunner() {
  const [applied, setApplied] = useState<Applied[] | null>(null)
  const [pending, setPending] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    void (async () => {
      try {
        const look = await fetch('/api/seed')
        if (!look.ok) return
        const { pending: waiting } = (await look.json()) as {
          pending: { items: number }[]
        }
        if (waiting.length === 0) return

        setPending(waiting.reduce((sum, set) => sum + set.items, 0))

        const run = await fetch('/api/seed', { method: 'POST' })
        if (!run.ok) {
          setFailed(true)
          return
        }
        const result = (await run.json()) as { applied: Applied[] }
        setApplied(result.applied)
      } catch {
        setFailed(true)
      }
    })()
  }, [])

  if (failed) {
    return (
      <p role="alert" className="mt-4 rounded-xl bg-surface px-3 py-3 text-xs text-class-high">
        Could not add the new lessons. Reload and it will try again.
      </p>
    )
  }

  if (applied === null) {
    if (pending === null) return null
    return (
      <p className="mt-4 rounded-xl bg-surface px-3 py-3 text-xs text-muted">
        Adding {pending} items from your latest lessons…
      </p>
    )
  }

  const added = applied.reduce((sum, set) => sum + set.added, 0)
  if (added === 0) return null

  return (
    <div className="mt-4 rounded-xl bg-surface px-3 py-3 text-xs leading-relaxed text-muted">
      <p className="text-foreground">Added {added} items from your latest lessons.</p>
      <ul className="mt-2 space-y-0.5">
        {applied
          .filter((set) => set.added > 0)
          .map((set) => (
            <li key={set.id}>
              {set.pack} — {set.added}
              {set.alreadyHad > 0 ? ` (${set.alreadyHad} you already had)` : ''}
            </li>
          ))}
      </ul>
      <p className="mt-2">
        Examples and classifiers are being written for them now; you can practise meanwhile.
      </p>
    </div>
  )
}
