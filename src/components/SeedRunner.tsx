'use client'

import { useEffect, useRef, useState } from 'react'

interface Applied {
  id: string
  pack: string
  added: number
  alreadyHad: number
}

interface Revised {
  updated: number
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
  const [revised, setRevised] = useState<Revised | null>(null)
  const [retopiced, setRetopiced] = useState<{ renamed: number } | null>(null)
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
        const { pending: waiting, revisions, retopic } = (await look.json()) as {
          pending: { items: number }[]
          revisions: boolean
          retopic: boolean
        }
        // Either there is new vocabulary to file, or there are examples and
        // classifiers waiting to be written onto what is already here.
        if (waiting.length === 0 && !revisions && !retopic) return

        setPending(waiting.reduce((sum, set) => sum + set.items, 0))

        const run = await fetch('/api/seed', { method: 'POST' })
        if (!run.ok) {
          setFailed(true)
          return
        }
        const result = (await run.json()) as {
          applied: Applied[]
          revised: Revised
          retopiced: { renamed: number }
        }
        setApplied(result.applied)
        setRevised(result.revised)
        setRetopiced(result.retopiced)
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
  const updated = revised?.updated ?? 0
  const renamed = retopiced?.renamed ?? 0
  if (added === 0 && updated === 0 && renamed === 0) return null

  return (
    <div className="mt-4 rounded-xl bg-surface px-3 py-3 text-xs leading-relaxed text-muted">
      {added > 0 ? (
        <p className="text-foreground">Added {added} items from your latest lessons.</p>
      ) : null}
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
      {renamed > 0 ? (
        <p className={added > 0 || updated > 0 ? 'mt-2' : 'text-foreground'}>
          Tidied your topics — {renamed} cards moved onto the shorter list.
        </p>
      ) : null}
      {updated > 0 ? (
        <p className={added > 0 ? 'mt-2' : 'text-foreground'}>
          Filled in examples, classifiers and usage notes on {updated} cards.
        </p>
      ) : (
        <p className="mt-2">
          Examples and classifiers are being written for them now; you can practise meanwhile.
        </p>
      )}
    </div>
  )
}
