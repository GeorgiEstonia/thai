'use client'

import { useState, useTransition } from 'react'

import type { WordRecord } from '@/content/items'

import { editWord, removeWord } from './actions'

export default function WordRow({ word }: { word: WordRecord }) {
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    thai: word.thai,
    ipa: word.ipa,
    english: word.english,
    notes: word.notes ?? '',
    pack: word.pack ?? '',
  })

  function save() {
    startTransition(async () => {
      await editWord(word.id, { ...draft, notes: draft.notes || null, pack: draft.pack || null })
      setEditing(false)
    })
  }

  if (editing) {
    const field = (key: keyof typeof draft, placeholder: string, className = '') => (
      <input
        value={draft[key]}
        placeholder={placeholder}
        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
        className={`w-full rounded-lg bg-surface px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-class-mid ${className}`}
      />
    )

    return (
      <li className="space-y-2 py-3">
        {field('thai', 'Thai', 'thai text-xl')}
        {field('ipa', 'IPA', 'font-mono')}
        {field('english', 'English')}
        {field('pack', 'Pack')}
        {field('notes', 'Notes')}
        <div className="flex gap-3 text-xs">
          <button onClick={save} disabled={pending} className="underline underline-offset-4">
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-muted underline underline-offset-4"
          >
            Cancel
          </button>
        </div>
      </li>
    )
  }

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
      <div className="flex shrink-0 flex-col gap-1 text-xs text-muted">
        <button onClick={() => setEditing(true)} className="underline underline-offset-4">
          edit
        </button>
        <button
          onClick={() => startTransition(() => removeWord(word.id))}
          className="underline underline-offset-4"
        >
          remove
        </button>
      </div>
    </li>
  )
}
