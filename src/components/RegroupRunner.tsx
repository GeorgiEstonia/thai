'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface Result {
  sorted: number
  packs: { pack: string; count: number }[]
  missed: number
}

/**
 * Sorts vocabulary that was imported before imports named their own topic.
 *
 * A one-off tidy of what is already there. It runs on sight rather than
 * waiting to be asked, for the same reason the duplicate cleanup does: the
 * mess is the app's doing, not yours.
 */
export default function RegroupRunner() {
  const router = useRouter()
  const [pending, setPending] = useState<number | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [failed, setFailed] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    void (async () => {
      try {
        const look = await fetch('/api/regroup')
        if (!look.ok) return
        const { pending: waiting } = (await look.json()) as { pending: number }
        if (waiting === 0) return

        setPending(waiting)
        const run = await fetch('/api/regroup', { method: 'POST' })
        if (!run.ok) {
          setFailed(true)
          return
        }
        setResult((await run.json()) as Result)
        router.refresh()
      } catch {
        setFailed(true)
      }
    })()
  }, [router])

  if (failed) {
    return (
      <p role="alert" className="mt-4 rounded-xl bg-surface px-3 py-3 text-xs text-class-high">
        Could not sort the ungrouped words. Reload and it will try again.
      </p>
    )
  }

  if (result === null) {
    if (pending === null) return null
    return (
      <p className="mt-4 rounded-xl bg-surface px-3 py-3 text-xs text-muted">
        Sorting {pending} ungrouped words into topics…
      </p>
    )
  }

  if (result.sorted === 0) return null

  return (
    <div className="mt-4 rounded-xl bg-surface px-3 py-3 text-xs leading-relaxed text-muted">
      <p className="text-foreground">Sorted {result.sorted} loose words into topics.</p>
      <ul className="mt-2 space-y-0.5">
        {result.packs.slice(0, 8).map((pack) => (
          <li key={pack.pack}>
            {pack.pack} — {pack.count}
          </li>
        ))}
      </ul>
      {result.missed > 0 ? (
        <p className="mt-2">{result.missed} stayed ungrouped; you can pack those by hand.</p>
      ) : null}
    </div>
  )
}
