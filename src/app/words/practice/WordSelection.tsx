'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { DIRECTIONS, WORD_DIRECTION_LABELS, type Direction } from '@/content/items'

interface Pack {
  id: string
  label: string
  preview: string[]
  waiting: number
}

export default function WordSelection({ packs }: { packs: Pack[] }) {
  const router = useRouter()
  const [chosen, setChosen] = useState<string[]>([])
  const [directions, setDirections] = useState<Direction[]>([...DIRECTIONS])

  const canStart = chosen.length > 0 && directions.length > 0
  const waiting = packs
    .filter((pack) => chosen.includes(pack.id))
    .reduce((sum, pack) => sum + pack.waiting, 0)

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <h1 className="text-lg font-medium">Practise words</h1>

      <section className="mt-5">
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
          <button
            onClick={() => setChosen(packs.map((pack) => pack.id))}
            className="text-xs text-muted underline underline-offset-4"
          >
            all
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {packs.map((pack) => {
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
      </section>

      <div className="sticky bottom-0 mt-8 -mx-5 border-t border-edge bg-background px-5 py-4">
        <button
          onClick={() =>
            router.push(
              `/drill?${new URLSearchParams({
                groups: chosen.join(','),
                dirs: directions.join(','),
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
