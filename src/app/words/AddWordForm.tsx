'use client'

import { useActionState, useEffect, useRef } from 'react'

import { createWord } from './actions'

export default function AddWordForm({ packs }: { packs: string[] }) {
  const [state, formAction, pending] = useActionState(createWord, {})
  const formRef = useRef<HTMLFormElement>(null)

  // Clear the form after a successful add so the next word can be typed
  // straight away — this screen is used in bursts after a lesson.
  useEffect(() => {
    if (state?.added) formRef.current?.reset()
  }, [state?.added])

  return (
    <form ref={formRef} action={formAction} className="mt-4 flex flex-col gap-2">
      <input
        name="thai"
        placeholder="Thai"
        autoComplete="off"
        className="thai rounded-xl border border-edge bg-surface px-3 py-3 text-xl outline-none focus:border-class-mid"
      />
      <input
        name="ipa"
        placeholder="IPA"
        autoComplete="off"
        className="rounded-xl border border-edge bg-surface px-3 py-3 font-mono text-sm outline-none focus:border-class-mid"
      />
      <input
        name="english"
        placeholder="English"
        autoComplete="off"
        className="rounded-xl border border-edge bg-surface px-3 py-3 text-sm outline-none focus:border-class-mid"
      />
      <div className="flex gap-2">
        <input
          name="pack"
          list="packs"
          placeholder="Pack (optional)"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-edge bg-surface px-3 py-3 text-sm outline-none focus:border-class-mid"
        />
        <datalist id="packs">
          {packs.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <select
          name="kind"
          className="rounded-xl border border-edge bg-surface px-3 py-3 text-sm outline-none focus:border-class-mid"
        >
          <option value="word">word</option>
          <option value="phrase">phrase</option>
        </select>
      </div>

      <input
        name="notes"
        placeholder="Notes (optional)"
        autoComplete="off"
        className="rounded-xl border border-edge bg-surface px-3 py-3 text-sm outline-none focus:border-class-mid"
      />

      {state?.error ? <p className="text-xs text-class-high">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-foreground py-3 text-sm font-medium text-background disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add word'}
      </button>
    </form>
  )
}
