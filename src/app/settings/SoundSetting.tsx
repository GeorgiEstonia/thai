'use client'

import { useSpeech } from '@/lib/speech'

/**
 * The same setting as the speaker in the drill header, in the place you would
 * look for it. Both read the one stored value, so changing it here changes it
 * there — a second copy of the state would be a second thing to get wrong.
 */
export default function SoundSetting() {
  const speech = useSpeech()

  if (speech.ready && !speech.available) {
    return (
      <div>
        <p className="text-sm">Pronunciation</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          No Thai voice on this device, so cards stay silent. On iPhone: Settings →
          Accessibility → Spoken Content → Voices → Thai.
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm">Pronunciation</p>
        <p className="mt-1 text-xs text-muted">
          Speaks the Thai when it appears, in the device&rsquo;s own Thai voice.
        </p>
      </div>
      <button
        onClick={() => speech.setMuted(!speech.muted)}
        aria-pressed={!speech.muted}
        className={`shrink-0 rounded-xl border px-4 py-2 text-sm ${
          speech.muted ? 'border-edge text-muted' : 'border-class-mid bg-surface'
        }`}
      >
        {speech.muted ? 'Off' : 'On'}
      </button>
    </div>
  )
}
