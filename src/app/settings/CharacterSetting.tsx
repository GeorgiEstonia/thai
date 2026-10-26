'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { CHARACTERS_COOKIE } from '@/lib/preference-keys'

/**
 * Whether the writing system joins ordinary practice.
 *
 * It used to be a tab of its own, which made it a separate subject you had to
 * decide to study — and so one you could quietly stop studying. Mixed into the
 * words instead, the letters turn up beside vocabulary you already want.
 */
export default function CharacterSetting({ initial }: { initial: boolean }) {
  const router = useRouter()
  // Handed down from the server, which has already read the cookie. Reading it
  // again here would mean a first render that disagrees with the markup.
  const [on, setOn] = useState(initial)

  function toggle() {
    const next = !on
    setOn(next)
    // A year, and site-wide: this is a preference, not a session.
    document.cookie = `${CHARACTERS_COOKIE}=${next ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm">Letters in practice</p>
        <p className="mt-1 text-xs text-muted">
          Mixes consonants and vowels in with your words.
        </p>
      </div>
      <button
        onClick={toggle}
        aria-pressed={on}
        className={`shrink-0 rounded-xl border px-4 py-2 text-sm ${
          on ? 'border-class-mid bg-surface' : 'border-edge text-muted'
        }`}
      >
        {on ? 'On' : 'Off'}
      </button>
    </div>
  )
}
