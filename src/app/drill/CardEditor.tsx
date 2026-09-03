'use client'

import { useState, useTransition } from 'react'

import type { WordRecord } from '@/content/items'

import { editDrillWord, removeDrillWord } from './actions'

/**
 * Fixing a card at the moment you notice it is wrong.
 *
 * A card imported from a photograph can carry a misread vowel or a gloss that
 * doesn't match how your teacher uses the word, and the moment you find out is
 * the moment you flip it. Sending you to another screen to fix it means it
 * doesn't get fixed — you're mid-drill — and a card you know is wrong is worse
 * than no card, because you keep rehearsing the error.
 *
 * Only vocabulary is editable. Consonants and vowels are authored content, the
 * same for every session, and not yours to correct from here.
 */
export default function CardEditor({
  word,
  onEdited,
  onDeleted,
}: {
  word: WordRecord
  onEdited: (patch: { thai: string; ipa: string; english: string; notes: string | null }) => void
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    thai: word.thai,
    ipa: word.ipa,
    english: word.english,
    notes: word.notes ?? '',
  })

  function save() {
    const patch = {
      thai: draft.thai.trim(),
      ipa: draft.ipa.trim(),
      english: draft.english.trim(),
      notes: draft.notes.trim() || null,
    }
    if (!patch.thai || !patch.english) {
      setError('Thai and English are both needed.')
      return
    }

    startTransition(async () => {
      try {
        await editDrillWord(word.id, { ...patch, pack: word.pack })
        onEdited(patch)
        setOpen(false)
        setError(null)
      } catch {
        setError('That change did not save.')
      }
    })
  }

  function remove() {
    startTransition(async () => {
      try {
        await removeDrillWord(word.id)
        onDeleted()
      } catch {
        setError('That card was not deleted.')
      }
    })
  }

  if (!open) {
    return (
      <div className="flex items-center justify-center gap-5 text-xs text-muted">
        <button onClick={() => setOpen(true)} className="underline underline-offset-4">
          edit card
        </button>
        {confirming ? (
          <>
            <button
              onClick={remove}
              disabled={pending}
              className="text-class-high underline underline-offset-4 disabled:opacity-40"
            >
              {pending ? 'deleting…' : 'really delete'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="underline underline-offset-4"
            >
              keep
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="underline underline-offset-4"
          >
            delete
          </button>
        )}
        {error ? <span className="text-class-high">{error}</span> : null}
      </div>
    )
  }

  const field = 'w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm outline-none focus:border-class-mid'

  return (
    <div className="space-y-2 text-left">
      <input
        value={draft.thai}
        onChange={(event) => setDraft((d) => ({ ...d, thai: event.target.value }))}
        aria-label="Thai"
        className={`thai ${field} text-lg`}
      />
      <input
        value={draft.ipa}
        onChange={(event) => setDraft((d) => ({ ...d, ipa: event.target.value }))}
        aria-label="IPA"
        className={`${field} font-mono`}
      />
      <input
        value={draft.english}
        onChange={(event) => setDraft((d) => ({ ...d, english: event.target.value }))}
        aria-label="English"
        className={field}
      />
      <input
        value={draft.notes}
        onChange={(event) => setDraft((d) => ({ ...d, notes: event.target.value }))}
        aria-label="Notes"
        placeholder="notes (optional)"
        className={field}
      />

      {error ? <p className="text-xs text-class-high">{error}</p> : null}

      <div className="flex items-center gap-4 text-xs">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-foreground px-4 py-2 text-background disabled:opacity-40"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setOpen(false)} className="text-muted underline underline-offset-4">
          cancel
        </button>
      </div>
    </div>
  )
}
