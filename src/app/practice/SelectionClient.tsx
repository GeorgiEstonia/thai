'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import {
  DIRECTIONS,
  DIRECTION_LABELS,
  type Direction,
  PRACTICE_ITEMS,
  SELECTABLE_GROUPS,
  cardKey,
} from '@/content/items'

interface Props {
  dueByKey: Record<string, boolean>
  seenKeys: string[]
}

export default function SelectionClient({ dueByKey, seenKeys }: Props) {
  const router = useRouter()
  const [groups, setGroups] = useState<string[]>([])
  const [directions, setDirections] = useState<Direction[]>([...DIRECTIONS])

  const seen = useMemo(() => new Set(seenKeys), [seenKeys])

  /** Cards due and cards never seen, per group, for the chosen directions. */
  const stats = useMemo(() => {
    const out: Record<string, { due: number; fresh: number; total: number }> = {}

    const countInto = (group: string, type: 'character' | 'vowel' | 'word', id: string) => {
      const bucket = (out[group] ??= { due: 0, fresh: 0, total: 0 })
      for (const direction of directions) {
        const key = cardKey(type, id, direction)
        bucket.total++
        if (!seen.has(key)) bucket.fresh++
        else if (dueByKey[key]) bucket.due++
      }
    }

    for (const item of PRACTICE_ITEMS) countInto(item.group, item.type, item.id)

    return out
  }, [directions, dueByKey, seen])

  const consonants = SELECTABLE_GROUPS.filter((group) => group.kind === 'character')
  const vowels = SELECTABLE_GROUPS.filter((group) => group.kind === 'vowel')

  function toggleGroup(id: string) {
    setGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]))
  }

  function toggleDirection(direction: Direction) {
    setDirections((prev) =>
      prev.includes(direction)
        ? prev.filter((d) => d !== direction)
        : [...prev, direction].sort(
            (a, b) => DIRECTIONS.indexOf(a) - DIRECTIONS.indexOf(b),
          ),
    )
  }

  const selectedCards = groups.reduce((sum, id) => sum + (stats[id]?.total ?? 0), 0)
  const selectedDue = groups.reduce(
    (sum, id) => sum + (stats[id]?.due ?? 0) + (stats[id]?.fresh ?? 0),
    0,
  )
  const canStart = groups.length > 0 && directions.length > 0

  function start() {
    const search = new URLSearchParams({
      groups: groups.join(','),
      dirs: directions.join(','),
    })
    router.push(`/drill?${search.toString()}`)
  }

  function renderGroup(group: {
    id: string
    kind: string
    label: string
    preview: string[]
    count: number
  }) {
    const selected = groups.includes(group.id)
    const stat = stats[group.id] ?? { due: 0, fresh: 0, total: 0 }
    const waiting = stat.due + stat.fresh

    return (
      <button
        key={`${group.kind}-${group.id}`}
        onClick={() => toggleGroup(group.id)}
        aria-pressed={selected}
        className={`rounded-xl border p-3 text-left transition-colors ${
          selected ? 'border-class-mid bg-surface' : 'border-edge'
        }`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-sm">{group.label}</span>
          {waiting > 0 ? (
            <span className="text-[11px] text-class-high">{waiting}</span>
          ) : (
            <span className="text-[11px] text-muted">✓</span>
          )}
        </div>
        <p className="thai mt-1 text-xl leading-snug">{group.preview.join(' ')}</p>
      </button>
    )
  }

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium">This session</h1>
        <Link href="/progress" className="text-sm text-muted underline underline-offset-4">
          Progress
        </Link>
      </header>
      <p className="mt-2 text-sm text-muted">
        Pick the sounds you&rsquo;re working on. The number is how many cards are waiting;
        a tick means nothing is due.
      </p>

      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-widest text-muted">Direction</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {DIRECTIONS.map((direction) => {
            const on = directions.includes(direction)
            return (
              <button
                key={direction}
                onClick={() => toggleDirection(direction)}
                aria-pressed={on}
                className={`rounded-xl border px-3 py-3 text-sm ${
                  on ? 'border-class-mid bg-surface' : 'border-edge text-muted'
                }`}
              >
                {DIRECTION_LABELS[direction]}
              </button>
            )
          })}
        </div>
        {directions.length === 0 ? (
          <p className="mt-2 text-xs text-class-high">Pick at least one direction.</p>
        ) : null}
      </section>

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-widest text-muted">Consonants</h2>
          <button
            onClick={() => setGroups(consonants.map((g) => g.id))}
            className="text-xs text-muted underline underline-offset-4"
          >
            all
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">{consonants.map(renderGroup)}</div>
      </section>

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-widest text-muted">Vowels</h2>
          <button
            onClick={() => setGroups(vowels.map((g) => g.id))}
            className="text-xs text-muted underline underline-offset-4"
          >
            all
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">{vowels.map(renderGroup)}</div>
      </section>

      {groups.length > 0 ? (
        <button
          onClick={() => setGroups([])}
          className="mt-4 text-xs text-muted underline underline-offset-4"
        >
          Clear selection
        </button>
      ) : null}

      {/* Sticky so the start button is reachable without scrolling back up. */}
      <div className="sticky bottom-0 mt-8 -mx-5 border-t border-edge bg-background px-5 py-4">
        <button
          onClick={start}
          disabled={!canStart}
          className="w-full rounded-2xl bg-foreground py-4 text-base font-medium text-background disabled:opacity-40"
        >
          {canStart ? `Start · ${selectedDue} of ${selectedCards} waiting` : 'Pick some sounds'}
        </button>
      </div>
    </main>
  )
}
