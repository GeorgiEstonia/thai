'use client'

import { useTransition } from 'react'

import type { WordRecord } from '@/content/items'

import { removeWord } from './actions'

export default function WordRow({ word }: { word: WordRecord }) {
  const [pending, startTransition] = useTransition()

  return (
    <li className={`flex items-start gap-3 py-3 ${pending ? 'opacity-40' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="thai text-xl">{word.thai}</p>
        <p className="mt-0.5 text-sm text-muted">
          {word.ipa ? <span className="font-mono">/{word.ipa}/ </span> : null}
          {word.english}
        </p>
        <p className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase text-muted">
          {word.kind === 'phrase' ? <span>phrase</span> : null}
          {word.pack ? <span>{word.pack}</span> : null}
        </p>
        {word.notes ? <p className="mt-1 text-xs text-muted">{word.notes}</p> : null}
      </div>
      <button
        onClick={() => startTransition(() => removeWord(word.id))}
        className="shrink-0 text-xs text-muted underline underline-offset-4"
      >
        remove
      </button>
    </li>
  )
}
