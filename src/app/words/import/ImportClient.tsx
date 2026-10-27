'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { type ImportResult, importPaste } from './actions'

const PLACEHOLDER = `หมา | mǎː | dog
แมว | mɛːw | cat
บ้าน | bâːn | house`

export default function ImportClient({ packs }: { packs: string[] }) {
  const [result, formAction, pending] = useActionState<ImportResult | undefined, FormData>(
    importPaste,
    undefined,
  )

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <h1 className="text-lg font-medium">Paste words</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        For vocabulary that has already been written out somewhere. One item per line: Thai,
        the sound, then the English, separated by <code>|</code> or a tab. A pasted table
        works. Examples and classifiers are written afterwards, the same as for a photo.
      </p>

      <form action={formAction} className="mt-5">
        <label className="text-xs uppercase tracking-widest text-muted" htmlFor="pack">
          Pack (optional — named for you if left blank)
        </label>
        <input
          id="pack"
          name="pack"
          list="packs"
          placeholder="e.g. Chapter 4"
          className="mt-1 w-full rounded-xl border border-edge bg-surface px-3 py-3 text-sm outline-none focus:border-class-mid"
        />
        <datalist id="packs">
          {packs.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <textarea
          name="text"
          rows={12}
          placeholder={PLACEHOLDER}
          className="thai mt-3 w-full resize-y rounded-xl border border-edge bg-surface px-3 py-3 text-base outline-none focus:border-class-mid"
        />

        <button
          type="submit"
          disabled={pending}
          className="mt-3 w-full rounded-2xl bg-foreground py-4 text-base font-medium text-background disabled:opacity-40"
        >
          {pending ? 'Importing…' : 'Import'}
        </button>
      </form>

      {result?.error ? (
        <p role="alert" className="mt-4 rounded-xl bg-surface px-3 py-3 text-sm text-class-high">
          {result.error}
        </p>
      ) : null}

      {result?.added !== undefined ? (
        <div className="mt-4 rounded-xl bg-surface px-3 py-3 text-sm">
          <p>
            Added {result.added} {result.added === 1 ? 'item' : 'items'}
            {result.pack ? (
              <>
                {' '}
                to <span className="font-medium">{result.pack}</span>
              </>
            ) : null}
            .
          </p>
          {result.duplicates ? (
            <p className="mt-1 text-xs text-muted">
              {result.duplicates} were already in your deck and were left alone.
            </p>
          ) : null}
          <Link
            href="/practice"
            className="mt-3 inline-block rounded-xl border border-edge px-4 py-2 text-sm"
          >
            Practise them
          </Link>
        </div>
      ) : null}

      {result?.skippedLines?.length ? (
        <div className="mt-4 rounded-xl border border-edge px-3 py-3">
          <p className="text-xs text-muted">
            These lines could not be read and were left out:
          </p>
          <ul className="mt-2 space-y-1">
            {result.skippedLines.map((row) => (
              <li key={row.line} className="truncate font-mono text-[11px] text-class-high">
                {row.line}: {row.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  )
}
