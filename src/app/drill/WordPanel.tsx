'use client'

import { useEffect, useState } from 'react'

import { useSpeech } from '@/lib/speech'

import { alsoIn } from './actions'
import type { Picked } from './TappableThai'

/**
 * What one word in a sentence means.
 *
 * Expands under the sentence rather than floating over the card. There is no
 * modal anywhere in this app and this is not the place to introduce one: a
 * panel that covers the card hides the sentence you are asking about, and
 * brings a backdrop, a focus trap and a scroll lock with it for no gain.
 *
 * The meaning and reading come down with the card, so the panel is filled the
 * moment it opens. Only "also in" is fetched, because it is the one part that
 * needs the rest of the deck.
 */
export default function WordPanel({ picked }: { picked: Picked }) {
  const speech = useSpeech()
  const [elsewhere, setElsewhere] = useState<{ thai: string; english: string }[] | null>(null)

  const thai = picked.segment.text

  // Remounted per word by its key in the card, so the previous word's results
  // cannot linger: resetting state inside the effect would be a second render
  // showing stale rows under a new headword.
  useEffect(() => {
    let live = true

    void alsoIn(thai)
      .then((rows) => {
        if (live) setElsewhere(rows)
      })
      .catch(() => {
        // The meaning is already on screen; a failed extra is not worth a
        // message of its own.
        if (live) setElsewhere([])
      })

    return () => {
      live = false
    }
  }, [thai])

  return (
    <div className="mt-2 rounded-xl border border-edge bg-background px-3 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="thai text-xl">{thai}</p>
        <button
          onClick={() => speech.speak(thai)}
          className="shrink-0 text-xs text-muted underline underline-offset-4"
        >
          <span aria-hidden>🔊</span> say it
        </button>
      </div>

      {picked.segment.gloss?.ipa ? (
        <p className="mt-1 font-mono text-xs text-muted">/{picked.segment.gloss.ipa}/</p>
      ) : null}
      <p className="mt-1 text-sm">{picked.segment.gloss?.english}</p>

      {elsewhere && elsewhere.length > 0 ? (
        <div className="mt-3 border-t border-edge pt-2">
          <p className="text-[10px] uppercase tracking-widest text-muted">Also in</p>
          <ul className="mt-1 space-y-1">
            {elsewhere.map((row) => (
              <li key={row.thai}>
                <span className="thai text-base">{row.thai}</span>
                <span className="block text-xs text-muted">{row.english}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
