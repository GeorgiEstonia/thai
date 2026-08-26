'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import type { GeneratedWord } from '@/lib/generate'

import { acceptWords, suggestWords } from './actions'

export default function GenerateClient({
  packs,
  deckSize,
}: {
  packs: string[]
  deckSize: number
}) {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(15)
  const [pack, setPack] = useState('')
  const [level, setLevel] = useState<string | null>(null)
  const [items, setItems] = useState<(GeneratedWord & { keep: boolean })[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  function generate() {
    if (!topic.trim()) return
    setBusy(true)
    setError(null)
    startTransition(async () => {
      try {
        const result = await suggestWords(topic.trim(), count)
        setLevel(result.level)
        setItems(result.items.map((item) => ({ ...item, keep: true })))
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'That did not work.')
      }
      setBusy(false)
    })
  }

  function accept() {
    setBusy(true)
    startTransition(async () => {
      await acceptWords(
        items.filter((item) => item.keep).map((item) => ({
          thai: item.thai,
          ipa: item.ipa,
          english: item.english,
          kind: item.kind,
          notes: item.notes,
        })),
        pack.trim() || topic.trim() || null,
      )
      router.push('/words')
    })
  }

  const keeping = items.filter((item) => item.keep).length

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <h1 className="text-lg font-medium">Generate words</h1>
      <p className="mt-2 text-sm text-muted">
        Pitched at the level of the {deckSize} word{deckSize === 1 ? '' : 's'} you already have,
        and never repeating them.
      </p>

      <div className="mt-5 space-y-2">
        <input
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Topic — e.g. ordering food, renting a flat"
          className="w-full rounded-xl border border-edge bg-surface px-3 py-3 text-sm outline-none focus:border-class-mid"
        />
        <div className="flex gap-2">
          <input
            type="number"
            min={5}
            max={40}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            className="w-24 rounded-xl border border-edge bg-surface px-3 py-3 text-sm outline-none focus:border-class-mid"
          />
          <input
            value={pack}
            list="packs"
            onChange={(event) => setPack(event.target.value)}
            placeholder="Pack (defaults to topic)"
            className="min-w-0 flex-1 rounded-xl border border-edge bg-surface px-3 py-3 text-sm outline-none focus:border-class-mid"
          />
          <datalist id="packs">
            {packs.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <button
          onClick={generate}
          disabled={busy || !topic.trim()}
          className="w-full rounded-xl bg-foreground py-3 text-sm font-medium text-background disabled:opacity-40"
        >
          {busy && items.length === 0 ? 'Thinking…' : 'Suggest'}
        </button>
      </div>

      {error ? <p className="mt-3 text-xs text-class-high">{error}</p> : null}
      {level ? <p className="mt-4 text-xs text-muted">Level read: {level}</p> : null}

      {items.length > 0 ? (
        <>
          <ul className="mt-4 divide-y divide-edge">
            {items.map((item, index) => (
              <li key={index} className={`py-3 ${item.keep ? '' : 'opacity-40'}`}>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.keep}
                    onChange={(event) =>
                      setItems((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, keep: event.target.checked } : row,
                        ),
                      )
                    }
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="thai block text-xl">{item.thai}</span>
                    <span className="mt-0.5 block text-sm text-muted">
                      <span className="font-mono">/{item.ipa}/</span> {item.english}
                    </span>
                    {item.notes ? (
                      <span className="mt-1 block text-xs text-muted">{item.notes}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="sticky bottom-0 mt-6 -mx-5 border-t border-edge bg-background px-5 py-4">
            <button
              onClick={accept}
              disabled={busy || keeping === 0}
              className="w-full rounded-2xl bg-foreground py-4 text-base font-medium text-background disabled:opacity-40"
            >
              {busy ? 'Adding…' : `Add ${keeping} word${keeping === 1 ? '' : 's'}`}
            </button>
          </div>
        </>
      ) : null}
    </main>
  )
}
