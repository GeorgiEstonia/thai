'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { tidyDuplicates } from './actions'

/**
 * Collapses vocabulary the deck holds more than once, on sight.
 *
 * This ran behind a button at first, on the principle that deleting rows is
 * something to be asked about. That was the wrong call for the situation it
 * exists for: a deck of 1,821 rows holding 208 real items is unusable, and a
 * banner asking permission to fix it is one more thing to do before you can
 * practise. So it just does it, and then says what it did.
 *
 * Safe to run at any time, and effectively self-retiring: adding now refuses
 * duplicates, so once this has run there is nothing left for it to find.
 */
export default function TidyDuplicates({ duplicates }: { duplicates: number }) {
  const router = useRouter()
  const [removed, setRemoved] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  // Ref rather than state: this must fire once, and StrictMode deliberately
  // runs effects twice in development.
  const started = useRef(false)

  useEffect(() => {
    if (duplicates === 0 || started.current) return
    started.current = true

    // No cancellation flag here, deliberately. The work runs exactly once —
    // the ref above sees to that — but this effect re-runs whenever the action
    // revalidates the page underneath it, and a flag cleared by that re-run
    // would throw away the result of a request that had already succeeded,
    // leaving "tidying up…" on screen forever.
    void tidyDuplicates()
      .then(({ removed: count }) => {
        setRemoved(count)
        router.refresh()
      })
      .catch(() => setFailed(true))
  }, [duplicates, router])

  if (duplicates === 0 && removed === null) return null

  if (failed) {
    return (
      <p role="alert" className="mt-4 rounded-xl bg-surface px-3 py-3 text-xs text-class-high">
        Could not tidy the duplicates. Reload and it will try again.
      </p>
    )
  }

  return (
    <p className="mt-4 rounded-xl bg-surface px-3 py-3 text-xs leading-relaxed text-muted">
      {removed === null ? (
        <>
          Tidying up {duplicates} duplicate {duplicates === 1 ? 'row' : 'rows'} — earlier imports
          re-added vocabulary the deck already had.
        </>
      ) : removed === 0 ? (
        <>Nothing to tidy.</>
      ) : (
        <>
          Removed {removed} duplicate {removed === 1 ? 'row' : 'rows'} left by earlier imports.
          The copy you had practised was kept, so no progress was lost.
        </>
      )}
    </p>
  )
}
