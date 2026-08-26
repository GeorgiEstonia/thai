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
  status: 'extracting' | 'ready' | 'failed' | 'reviewed'
  image: string
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

export default function ReviewClient({ worksheetId, status, image, extracted, error }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>(() => extracted.map((word) => ({ ...word, keep: true })))
  const [showImage, setShowImage] = useState(false)
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
        .map(({ thai, ipa, english, notes }) => ({ thai, ipa, english, notes }))
      await approveWords(worksheetId, approved)
      router.push('/words')
    })
  }

  if (status === 'extracting') {
    return (
      <p className="mt-8 text-sm text-muted">
        Reading the page… this usually takes a few seconds on a dense one.
      </p>
    )
  }

  if (status === 'failed') {
    return (
      <div className="mt-8">
        <p className="text-sm text-class-high">{error ?? 'Extraction failed.'}</p>
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
        Least certain first. Edit anything that is wrong, untick anything that is not
        vocabulary, then add.
      </p>

      <button
        onClick={() => setShowImage((v) => !v)}
        className="mt-3 text-xs text-muted underline underline-offset-4"
      >
        {showImage ? 'Hide the photo' : 'Show the photo'}
      </button>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="The photographed lesson page" className="mt-2 w-full rounded-xl" />
      ) : null}

      <ul className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <li
            key={index}
            className={`rounded-xl border p-3 ${
              row.keep ? 'border-edge' : 'border-edge opacity-40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`text-[10px] uppercase ${CONFIDENCE_STYLE[row.confidence]}`}>
                {row.confidence}
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
            {row.notes ? <p className="mt-1 text-xs text-muted">{row.notes}</p> : null}
          </li>
        ))}
      </ul>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Nothing was found on that page.</p>
      ) : (
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
