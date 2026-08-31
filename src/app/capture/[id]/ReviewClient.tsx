'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import type { ExtractedWord } from '@/lib/db/schema'

import { approveWords } from '../actions'

/**
 * The parent keys this component on the extraction status, so when polling
 * finally delivers the words the component remounts and `rows` initialises
 * from them — no effect syncing props into state.
 */
interface Props {
  worksheetId: string
  status: 'uploading' | 'extracting' | 'verifying' | 'ready' | 'failed' | 'reviewed'
  images: string[]
  pack: string | null
  autoAdded: number
  extracted: ExtractedWord[]
  error: string | null
}

interface Row extends ExtractedWord {
  keep: boolean
}

const CONFIDENCE_STYLE = {
  high: 'text-class-mid',
  medium: 'text-class-high',
  low: 'text-class-high',
} as const

export default function ReviewClient({
  worksheetId,
  status,
  images,
  pack,
  autoAdded,
  extracted,
  error,
}: Props) {
  const router = useRouter()
  // Everything that passed the check is already in the deck; this screen is
  // only for what was held back.
  const [rows, setRows] = useState<Row[]>(() =>
    extracted.filter((word) => !word.added).map((word) => ({ ...word, keep: false })),
  )
  const [showImages, setShowImages] = useState(false)
  const [packName, setPackName] = useState(pack ?? '')
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)

  // Extraction runs in the background, so poll until the server has an answer.
  useEffect(() => {
    if (status !== 'extracting') return
    const timer = setInterval(() => router.refresh(), 2000)
    return () => clearInterval(timer)
  }, [status, router])

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function approve() {
    setSaving(true)
    startTransition(async () => {
      const approved = rows
        .filter((row) => row.keep)
        .map(({ thai, ipa, english, kind, notes }) => ({ thai, ipa, english, kind, notes }))
      await approveWords(worksheetId, approved, packName.trim() || null)
      router.push('/words')
    })
  }

  if (status === 'uploading' || status === 'extracting' || status === 'verifying') {
    return (
      <div className="mt-8">
        <p className="text-sm text-muted">
          {status === 'verifying' ? 'Checking what was found…' : 'Reading the pages…'} You can
          leave this page and carry on practising; it keeps going without you.
        </p>
        <button
          onClick={() => {
            void fetch(`/api/worksheets/${worksheetId}/step`, { method: 'POST' })
            setTimeout(() => router.refresh(), 1500)
          }}
          className="mt-4 rounded-xl border border-edge px-4 py-2 text-xs text-muted"
        >
          Nudge it along
        </button>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="mt-8">
        <p className="text-sm text-class-high">{error ?? 'Extraction failed.'}</p>
        <button
          onClick={() => {
            void fetch(`/api/worksheets/${worksheetId}/step`, { method: 'POST' })
            setTimeout(() => router.refresh(), 1500)
          }}
          className="mt-3 rounded-xl border border-edge px-4 py-2 text-xs"
        >
          Try again
        </button>
        <p className="mt-2 text-sm text-muted">
          If this says the API key is missing, add ANTHROPIC_API_KEY to .env.local and try
          again.
        </p>
      </div>
    )
  }

  const keeping = rows.filter((row) => row.keep).length

  return (
    <>
      <p className="mt-2 text-sm text-muted">
        {autoAdded > 0 ? (
          <>
            <strong>{autoAdded}</strong> item{autoAdded === 1 ? '' : 's'} passed the check and
            {' '}are already in your deck.{' '}
          </>
        ) : null}
        {rows.length > 0
          ? `${rows.length} looked wrong and were held back. Fix and tick anything worth keeping.`
          : 'Nothing was held back.'}
      </p>

      <div className="mt-3">
        <label className="text-xs uppercase tracking-widest text-muted" htmlFor="pack">
          Pack
        </label>
        <input
          id="pack"
          value={packName}
          onChange={(event) => setPackName(event.target.value)}
          placeholder="Ungrouped"
          className="mt-1 w-full rounded-xl border border-edge bg-surface px-3 py-2 text-sm outline-none focus:border-class-mid"
        />
      </div>

      <button
        onClick={() => setShowImages((v) => !v)}
        className="mt-3 text-xs text-muted underline underline-offset-4"
      >
        {showImages ? 'Hide pages' : `Show ${images.length} page${images.length === 1 ? '' : 's'}`}
      </button>
      {showImages
        ? images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt={`Page ${i + 1}`} className="mt-2 w-full rounded-xl" />
          ))
        : null}

      <ul className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <li
            key={index}
            className={`rounded-xl border p-3 ${
              row.keep ? 'border-edge' : 'border-edge opacity-40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-2 text-[10px] uppercase">
                <span className={CONFIDENCE_STYLE[row.confidence]}>{row.confidence}</span>
                {row.kind === 'phrase' ? (
                  <span className="rounded-full border border-edge px-2 py-0.5 text-muted">
                    phrase
                  </span>
                ) : null}
              </span>
              <label className="flex items-center gap-2 text-xs text-muted">
                keep
                <input
                  type="checkbox"
                  checked={row.keep}
                  onChange={(event) => update(index, { keep: event.target.checked })}
                />
              </label>
            </div>

            <input
              value={row.thai}
              onChange={(event) => update(index, { thai: event.target.value })}
              className="thai mt-1 w-full rounded-lg bg-surface px-2 py-2 text-xl outline-none focus:ring-1 focus:ring-class-mid"
            />
            <input
              value={row.ipa}
              placeholder="IPA"
              onChange={(event) => update(index, { ipa: event.target.value })}
              className="mt-1 w-full rounded-lg bg-surface px-2 py-2 font-mono text-sm outline-none focus:ring-1 focus:ring-class-mid"
            />
            <input
              value={row.english}
              onChange={(event) => update(index, { english: event.target.value })}
              className="mt-1 w-full rounded-lg bg-surface px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-class-mid"
            />
            {row.issue ? (
              <p className="mt-1 text-xs text-class-high">{row.issue}</p>
            ) : null}
            {row.notes ? <p className="mt-1 text-xs text-muted">{row.notes}</p> : null}
          </li>
        ))}
      </ul>

      {rows.length === 0 ? null : (
        <div className="sticky bottom-0 mt-6 -mx-5 border-t border-edge bg-background px-5 py-4">
          <button
            onClick={approve}
            disabled={saving || keeping === 0}
            className="w-full rounded-2xl bg-foreground py-4 text-base font-medium text-background disabled:opacity-40"
          >
            {saving ? 'Adding…' : `Add ${keeping} word${keeping === 1 ? '' : 's'}`}
          </button>
        </div>
      )}
    </>
  )
}
