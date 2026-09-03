'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { tidyDuplicates } from './actions'

/**
 * Offered rather than done automatically.
 *
 * This deletes rows, and a deck is the one thing in the app that is genuinely
 * yours — so it says exactly how many and waits to be asked, instead of
 * quietly rewriting your vocabulary on a page load.
 */
export default function TidyDuplicates({ duplicates }: { duplicates: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<number | null>(null)

  if (duplicates === 0 && done === null) return null

  if (done !== null) {
    return (
      <p className="mt-4 rounded-xl bg-surface px-3 py-3 text-xs text-muted">
        Removed {done} duplicate {done === 1 ? 'row' : 'rows'}.
      </p>
    )
  }

  return (
    <div className="mt-4 rounded-xl bg-surface px-3 py-3">
      <p className="text-xs leading-relaxed text-muted">
        {duplicates} {duplicates === 1 ? 'row is' : 'rows are'} the same word more than once —
        earlier imports re-added vocabulary the deck already had. Removing them keeps the copy
        you have practised, so no progress is lost.
      </p>
      <button
        onClick={() =>
          startTransition(async () => {
            const { removed } = await tidyDuplicates()
            setDone(removed)
            router.refresh()
          })
        }
        disabled={pending}
        className="mt-3 rounded-xl border border-edge px-4 py-2 text-sm disabled:opacity-40"
      >
        {pending ? 'Removing…' : `Remove ${duplicates}`}
      </button>
    </div>
  )
}
