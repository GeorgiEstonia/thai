'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  DIRECTION_LABELS,
  type Direction,
  type PracticeItem,
  WORD_DIRECTION_LABELS,
  parseCardKey,
  produceHint,
} from '@/content/items'
import {
  type Grade,
  type SessionState,
  type SrsState,
  currentEntry,
  gradeCurrent,
} from '@/lib/srs'

import GlyphFaces from '@/components/GlyphFaces'

import MnemonicEditor from './MnemonicEditor'

import { gradeCard } from './actions'

export interface DrillCard {
  key: string
  item: PracticeItem
  direction: Direction
  state: SrsState
  note: string | null
}

interface Props {
  cards: DrillCard[]
  session: SessionState
}

/**
 * Which typeface the PROMPT uses. Looped by default — that is what you learn
 * from — but switchable, because reading loopless signage is its own skill and
 * worth drilling deliberately once the looped forms are solid.
 */
const FACE_OPTIONS = [
  { id: 'thai', label: 'looped' },
  { id: 'thai-serif', label: 'print' },
  { id: 'thai-hand', label: 'hand' },
  { id: 'thai-loopless', label: 'signage' },
] as const

const CLASS_STYLES = {
  mid: { label: 'mid class', text: 'text-class-mid', border: 'border-class-mid' },
  high: { label: 'high class', text: 'text-class-high', border: 'border-class-high' },
  low: { label: 'low class', text: 'text-class-low', border: 'border-class-low' },
} as const

/**
 * What happened this session.
 *
 * Every grade was written to the database as it was given, so this screen is a
 * record of work already saved — ending early loses nothing.
 */
function Summary({
  results,
  onAgain,
}: {
  results: {
    key: string
    label: string
    sub: string
    direction: Direction
    grade: Grade
    interval: number
  }[]
  onAgain: () => void
}) {
  const right = results.filter((r) => r.grade === 'got').length
  const wrong = results.length - right
  const accuracy = results.length > 0 ? Math.round((right / results.length) * 100) : 0

  // Last outcome per card, so a card seen twice shows where it ended up.
  const final = new Map(results.map((r) => [r.key, r]))

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <h1 className="text-lg font-medium">Session done</h1>

      {results.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nothing graded this time.</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-edge py-3">
              <p className="text-2xl text-class-mid">{right}</p>
              <p className="text-xs text-muted">right</p>
            </div>
            <div className="rounded-xl border border-edge py-3">
              <p className="text-2xl text-class-high">{wrong}</p>
              <p className="text-xs text-muted">missed</p>
            </div>
            <div className="rounded-xl border border-edge py-3">
              <p className="text-2xl">{accuracy}%</p>
              <p className="text-xs text-muted">accuracy</p>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted">
            All of it is saved. &ldquo;Next&rdquo; is when each card comes back.
          </p>

          <ul className="mt-3 divide-y divide-edge">
            {[...final.values()].map((row) => (
              <li key={row.key} className="flex items-center gap-3 py-2">
                <span className="thai min-w-0 flex-1 truncate text-lg">{row.label}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">{row.sub}</span>
                <span
                  className="text-[10px] uppercase text-muted"
                  title={row.direction === 'recognise' ? 'reading' : 'producing'}
                >
                  {row.direction === 'recognise' ? 'R' : 'P'}
                </span>
                <span
                  className={`text-xs ${row.grade === 'got' ? 'text-class-mid' : 'text-class-high'}`}
                >
                  {row.grade === 'got' ? 'right' : 'missed'}
                </span>
                <span className="w-16 text-right text-xs text-muted">
                  {row.interval === 0 ? 'next time' : `${row.interval}d`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-6 flex gap-3">
        <Link href="/practice" className="rounded-xl border border-edge px-5 py-3 text-sm">
          Characters
        </Link>
        <Link href="/words/practice" className="rounded-xl border border-edge px-5 py-3 text-sm">
          Words
        </Link>
        <button
          onClick={onAgain}
          className="rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background"
        >
          Again
        </button>
      </div>
    </main>
  )
}

function Card({
  revealed,
  onReveal,
  children,
}: {
  revealed: boolean
  onReveal: () => void
  children: React.ReactNode
}) {
  const className = 'flex-1 flex flex-col items-center justify-center text-center'

  if (revealed) return <div className={className}>{children}</div>

  return (
    <button onClick={onReveal} className={className} aria-label="Reveal answer">
      {children}
    </button>
  )
}

export default function DrillClient({ cards, session: initialSession }: Props) {
  const router = useRouter()
  const [session, setSession] = useState(initialSession)
  const [states, setStates] = useState(() => new Map(cards.map((c) => [c.key, c.state])))
  const [revealed, setRevealed] = useState(false)
  const [faceIndex, setFaceIndex] = useState(0)
  // Kept for the summary. Grades are already persisted per card the moment
  // they're given, so this is a display record, not the source of truth.
  const [results, setResults] = useState<
    {
      key: string
      label: string
      sub: string
      direction: Direction
      grade: Grade
      interval: number
    }[]
  >([])
  const [ended, setEnded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const face = FACE_OPTIONS[faceIndex]

  const byKey = new Map(cards.map((card) => [card.key, card]))
  const entry = currentEntry(session)
  const card = entry ? byKey.get(entry.id) : undefined

  function grade(g: Grade) {
    if (!entry || !card) return
    const state = states.get(entry.id)
    if (!state) return

    const parsed = parseCardKey(entry.id)
    const result = gradeCurrent(session, g, state, new Date())

    if (result.scheduling) {
      setStates((prev) => new Map(prev).set(entry.id, result.scheduling!.after))
    }

    if (!entry.reinforcement) {
      const after = result.scheduling?.after
      setResults((prev) => [
        ...prev,
        {
          key: entry.id,
          direction: card.direction,
          label: card.item.thai,
          sub:
            card.item.type === 'word'
              ? card.item.word.english
              : `/${card.item.ipa}/`,
          grade: g,
          interval: after?.intervalDays ?? state.intervalDays,
        },
      ])
    }
    setSession(result.session)
    setRevealed(false)
    setError(null)

    // Advance immediately and persist behind it — a drill that waits on the
    // network between cards stops being a drill.
    if (parsed) {
      startTransition(async () => {
        try {
          await gradeCard(parsed.type, parsed.id, parsed.direction, g, entry.reinforcement)
        } catch {
          setError('That answer did not save. Check your connection.')
        }
      })
    }
  }

  if (!entry || !card || ended) {
    return <Summary results={results} onAgain={() => router.refresh()} />
  }

  const { item, direction } = card
  const directionLabel =
    item.type === 'word' ? WORD_DIRECTION_LABELS[direction] : DIRECTION_LABELS[direction]
  const hint = direction === 'produce' ? produceHint(item) : null

  return (
    <main className="flex-1 flex flex-col px-5 pb-6 pt-4 max-w-md w-full mx-auto">
      <header className="flex items-center justify-between text-xs text-muted">
        <span>{session.queue.length} left</span>
        <span className="font-mono">{directionLabel}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFaceIndex((i) => (i + 1) % FACE_OPTIONS.length)}
            className="underline underline-offset-4"
            title="Change the typeface on the prompt"
          >
            {face.label}
          </button>
          <button onClick={() => setEnded(true)} className="underline underline-offset-4">
            End
          </button>
        </div>
      </header>

      {error ? (
        <p role="alert" className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-class-high">
          {error}
        </p>
      ) : null}

      {/* While unrevealed this is one big tap target, so it is a <button>.
          Once revealed it holds a textarea and its own buttons, and nesting
          interactive controls inside a <button> is invalid HTML — so it
          becomes a plain container instead. */}
      <Card revealed={revealed} onReveal={() => setRevealed(true)}>
        {/* FRONT — what you're being asked. */}
        {direction === 'recognise' ? (
          <span
            className={`${face.id} select-none leading-none ${
              item.type === 'word' ? (revealed ? 'text-4xl' : 'text-6xl') : revealed ? 'text-7xl' : 'text-[9rem]'
            }`}
          >
            {item.thai}
          </span>
        ) : item.type === 'word' ? (
          <span className="px-4 text-3xl leading-snug">{item.word.english}</span>
        ) : (
          <span className="flex flex-col items-center">
            <span
              className={`font-mono select-none leading-none ${revealed ? 'text-5xl' : 'text-7xl'}`}
            >
              /{item.ipa}/
            </span>
            {hint ? <span className="thai mt-4 text-lg text-muted">{hint}</span> : null}
          </span>
        )}

        {!revealed ? (
          <span className="mt-10 text-xs uppercase tracking-widest text-muted">tap to reveal</span>
        ) : (
          <div className="mt-8 w-full space-y-5">
            {/* BACK — the answer, then everything that helps it stick. */}
            {direction === 'recognise' ? (
              item.type === 'word' ? (
                <div>
                  <p className="text-2xl">{item.word.english}</p>
                  <p className="mt-1 font-mono text-lg text-muted">/{item.ipa}/</p>
                </div>
              ) : (
                <p className="font-mono text-4xl">/{item.ipa}/</p>
              )
            ) : (
              <div>
                <p
                  className={`thai leading-none ${item.type === 'word' ? 'text-4xl' : 'text-7xl'}`}
                >
                  {item.thai}
                </p>
                {item.type === 'word' ? (
                  <p className="mt-2 font-mono text-lg text-muted">/{item.ipa}/</p>
                ) : null}
              </div>
            )}

            {card.note ? (
              <p className="rounded-xl bg-surface px-3 py-3 text-sm leading-relaxed">
                {card.note}
              </p>
            ) : null}

            {item.type === 'character' ? (
              <>
                <p className="text-sm text-muted">
                  {item.phoneme.ipaFinal
                    ? `closes a syllable as /${item.phoneme.ipaFinal}/`
                    : 'never closes a syllable'}
                </p>
                <p
                  className={`inline-block rounded-full border px-3 py-1 text-xs ${
                    CLASS_STYLES[item.character.consonantClass].border
                  } ${CLASS_STYLES[item.character.consonantClass].text}`}
                >
                  {CLASS_STYLES[item.character.consonantClass].label}
                </p>
                <div>
                  <p className="thai text-2xl">{item.character.nameThai}</p>
                  <p className="mt-1 text-sm text-muted">
                    {item.character.namePaiboon} — {item.character.nameMeaning}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-muted">{item.character.mnemonic}</p>
              </>
            ) : item.type === 'word' ? (
              item.word.notes ? (
                <p className="text-sm leading-relaxed text-muted">{item.word.notes}</p>
              ) : null
            ) : (
              <>
                <p className="text-sm text-muted">
                  {item.vowel.length === 'long' ? 'long' : 'short'} · {item.vowel.positionNote}
                </p>
                <p className="text-sm leading-relaxed text-muted">{item.vowel.articulation}</p>
                <div className="border-t border-edge pt-4">
                  <p className="thai text-3xl">{item.vowel.exampleThai}</p>
                  <p className="mt-1 text-sm text-muted">
                    <span className="font-mono">/{item.vowel.exampleIpa}/</span> —{' '}
                    {item.vowel.exampleGloss}
                  </p>
                </div>
              </>
            )}

            {item.type !== 'word' ? (
              <div className="border-t border-edge pt-4">
                <p className="mb-2 text-xs uppercase tracking-widest text-muted">Same letter</p>
                <GlyphFaces glyph={item.thai} />
              </div>
            ) : null}

            <div className="border-t border-edge pt-4">
              <MnemonicEditor
                key={card.key}
                itemType={item.type}
                itemId={item.id}
                initial={card.note}
              />
            </div>
          </div>
        )}
      </Card>

      {revealed ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => grade('missed')}
            className="rounded-2xl border border-edge py-5 text-base font-medium"
          >
            Missed it
          </button>
          <button
            onClick={() => grade('got')}
            className="rounded-2xl bg-foreground py-5 text-base font-medium text-background"
          >
            Got it
          </button>
        </div>
      ) : (
        <div className="mt-6 h-[76px]" aria-hidden />
      )}
    </main>
  )
}
