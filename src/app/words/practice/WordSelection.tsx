'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { DIRECTIONS, WORD_DIRECTION_LABELS, type Direction } from '@/content/items'

type Kind = 'word' | 'phrase'

interface Pack {
  id: string
  kind: Kind
  label: string
  preview: string[]
  waiting: number
}

interface LockedPreview {
  thai: string
  english: string
  blockedBy: string[]
}

const KIND_LABELS: Record<Kind, string> = { word: 'Words', phrase: 'Phrases' }

export default function WordSelection({
  packs,
  lockedCount,
  nextUp,
}: {
  packs: Pack[]
  lockedCount: number
  nextUp: LockedPreview[]
}) {
  const router = useRouter()
  // Words first, deliberately. Phrases are the harder, later thing, and the
  // screen should open on the one you should be doing most days.
  const [kind, setKind] = useState<Kind>('word')
  const [chosen, setChosen] = useState<string[]>([])
  const [directions, setDirections] = useState<Direction[]>([...DIRECTIONS])

  const visible = packs.filter((pack) => pack.kind === kind)
  const canStart = chosen.length > 0 && directions.length > 0
  const waiting = visible
    .filter((pack) => chosen.includes(pack.id))
    .reduce((sum, pack) => sum + pack.waiting, 0)

  function chooseKind(next: Kind) {
    setKind(next)
    // Pack ids repeat across both halves, so a selection carried over would
    // silently mean something different.
    setChosen([])
  }

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <h1 className="text-lg font-medium">Practise vocabulary</h1>

      <section className="mt-5">
        <div className="grid grid-cols-2 gap-2">
          {(['word', 'phrase'] as const).map((option) => {
            const on = kind === option
            const count = packs
              .filter((pack) => pack.kind === option)
              .reduce((sum, pack) => sum + pack.waiting, 0)
            return (
              <button
                key={option}
                onClick={() => chooseKind(option)}
                aria-pressed={on}
                className={`rounded-xl border px-3 py-3 text-sm ${
                  on ? 'border-class-mid bg-surface' : 'border-edge text-muted'
                }`}
              >
                {KIND_LABELS[option]}
                {count > 0 ? <span className="ml-2 text-[11px] text-class-high">{count}</span> : null}
              </button>
            )
          })}
        </div>
      </section>

      {kind === 'phrase' ? (
        <section className="mt-4 rounded-xl bg-surface px-3 py-3">
          <p className="text-xs leading-relaxed text-muted">
            A phrase appears once you have got each of its words right at least once — so a
            sentence is never where you meet a new word.
          </p>
          {lockedCount > 0 ? (
            <>
              <p className="mt-2 text-xs text-muted">
                {lockedCount} {lockedCount === 1 ? 'phrase is' : 'phrases are'} waiting on words
                you haven&apos;t had right yet.
              </p>
              <ul className="mt-2 space-y-2">
                {nextUp.map((row) => (
                  <li key={row.thai} className="text-xs">
                    <span className="thai text-base text-muted">{row.thai}</span>
                    <span className="ml-2 text-muted">needs</span>{' '}
                    <span className="thai text-base">{row.blockedBy.join(' ')}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-widest text-muted">Direction</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {DIRECTIONS.map((direction) => {
            const on = directions.includes(direction)
            return (
              <button
                key={direction}
                onClick={() =>
                  setDirections((prev) =>
                    prev.includes(direction)
                      ? prev.filter((d) => d !== direction)
                      : [...prev, direction],
                  )
                }
                aria-pressed={on}
                className={`rounded-xl border px-3 py-3 text-sm ${
                  on ? 'border-class-mid bg-surface' : 'border-edge text-muted'
                }`}
              >
                {WORD_DIRECTION_LABELS[direction]}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-widest text-muted">Packs</h2>
          {visible.length > 0 ? (
            <button
              onClick={() => setChosen(visible.map((pack) => pack.id))}
              className="text-xs text-muted underline underline-offset-4"
            >
              all
            </button>
          ) : null}
        </div>

        {visible.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            {kind === 'phrase'
              ? 'No phrases are ready yet. Practise words and they will open up.'
              : 'No words yet.'}
          </p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {visible.map((pack) => {
              const on = chosen.includes(pack.id)
              return (
                <button
                  key={pack.id}
                  onClick={() =>
                    setChosen((prev) =>
                      prev.includes(pack.id)
                        ? prev.filter((id) => id !== pack.id)
                        : [...prev, pack.id],
                    )
                  }
                  aria-pressed={on}
                  className={`rounded-xl border p-3 text-left ${
                    on ? 'border-class-mid bg-surface' : 'border-edge'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm">{pack.label}</span>
                    {pack.waiting > 0 ? (
                      <span className="text-[11px] text-class-high">{pack.waiting}</span>
                    ) : (
                      <span className="text-[11px] text-muted">✓</span>
                    )}
                  </div>
                  <p className="thai mt-1 truncate text-lg">{pack.preview.join(' ')}</p>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <div className="sticky bottom-0 mt-8 -mx-5 border-t border-edge bg-background px-5 py-4">
        <button
          onClick={() =>
            router.push(
              `/drill?${new URLSearchParams({
                groups: chosen.join(','),
                dirs: directions.join(','),
                kind,
              })}`,
            )
          }
          disabled={!canStart}
          className="w-full rounded-2xl bg-foreground py-4 text-base font-medium text-background disabled:opacity-40"
        >
          {canStart ? `Start · ${waiting} waiting` : 'Pick a pack'}
        </button>
      </div>
    </main>
  )
}
