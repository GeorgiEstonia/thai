'use client'

import { useState, useTransition } from 'react'

import type { ItemType } from '@/content/items'

import { saveMnemonic } from './actions'

/**
 * A mnemonic you write yourself.
 *
 * The authored mnemonics in the content files are descriptions written by
 * someone else. One you wrote — from your own languages, your own lesson, the
 * thing it happened to remind you of — is a genuine memory hook, and that
 * difference is most of why mnemonics work at all. So this sits on the back of
 * every card, and what you write wins top billing on later reviews.
 *
 * The caller passes a `key` tied to the item, so moving to the next card
 * remounts this and resets the field — no effect needed.
 */
export default function MnemonicEditor({
  itemType,
  itemId,
  initial,
}: {
  itemType: ItemType
  itemId: string
  initial: string | null
}) {
  const [text, setText] = useState(initial ?? '')
  const [open, setOpen] = useState(Boolean(initial))
  const [saved, setSaved] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [, startTransition] = useTransition()

  function save() {
    setSaved('saving')
    startTransition(async () => {
      try {
        await saveMnemonic(itemType, itemId, text)
        setSaved('done')
      } catch {
        setSaved('error')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
        className="w-full rounded-xl border border-dashed border-edge py-3 text-xs text-muted"
      >
        + Write your own mnemonic
      </button>
    )
  }

  return (
    // Stops a tap inside the editor from counting as a tap on the card.
    <div onClick={(event) => event.stopPropagation()} className="text-left">
      <label htmlFor="mnemonic" className="text-xs uppercase tracking-widest text-muted">
        Your mnemonic
      </label>
      <textarea
        id="mnemonic"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setSaved('idle')
        }}
        onBlur={save}
        rows={3}
        placeholder="What does this remind you of?"
        className="mt-2 w-full resize-none rounded-xl border border-edge bg-surface px-3 py-2 text-sm outline-none focus:border-class-mid"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted">
          {saved === 'saving' ? 'Saving…' : null}
          {saved === 'done' ? 'Saved' : null}
          {saved === 'error' ? <span className="text-class-high">Not saved</span> : null}
        </span>
        <button onClick={save} className="text-xs underline underline-offset-4">
          Save
        </button>
      </div>
    </div>
  )
}
