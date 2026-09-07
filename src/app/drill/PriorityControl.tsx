'use client'

import { useState, useTransition } from 'react'

import { prioritiseWord } from './actions'

/**
 * How often you want a word to come round.
 *
 * A level, not a nudge. A control that shifts the schedule a little on every
 * tap compounds invisibly — press it three times over three weeks and you can
 * neither tell what you did nor undo it. This shows the current setting, takes
 * one tap to change, and the same tap again to clear.
 *
 * The effect is on the interval the scheduler works out: "more" halves it and
 * keeps the word inside a three-week ceiling, "less" doubles it. The doubling
 * ladder itself is untouched — only how far apart its rungs sit.
 */
const LEVELS = [
  { value: 1, label: 'More often', arrow: '▲' },
  { value: -1, label: 'Less often', arrow: '▼' },
] as const

export default function PriorityControl({
  wordId,
  initial,
}: {
  wordId: string
  initial: number
}) {
  const [level, setLevel] = useState(initial > 0 ? 1 : initial < 0 ? -1 : 0)
  const [pending, startTransition] = useTransition()
  const [failed, setFailed] = useState(false)

  function choose(value: number) {
    // Tapping the level you are already on clears it.
    const next = level === value ? 0 : value
    const previous = level

    setLevel(next)
    setFailed(false)

    startTransition(async () => {
      try {
        await prioritiseWord(wordId, next)
      } catch {
        setLevel(previous)
        setFailed(true)
      }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-2">
        {LEVELS.map((option) => {
          const on = level === option.value
          return (
            <button
              key={option.value}
              onClick={() => choose(option.value)}
              disabled={pending}
              aria-pressed={on}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs disabled:opacity-50 ${
                on ? 'border-class-mid bg-surface' : 'border-edge text-muted'
              }`}
            >
              <span aria-hidden className="mr-1">
                {option.arrow}
              </span>
              {option.label}
            </button>
          )
        })}
      </div>

      <p className="mt-2 text-center text-xs text-muted">
        {failed ? (
          <span className="text-class-high">That did not save.</span>
        ) : level === 1 ? (
          'Comes back twice as soon, and stays in circulation.'
        ) : level === -1 ? (
          'Comes back half as often.'
        ) : (
          'On the normal schedule.'
        )}
      </p>
    </div>
  )
}
