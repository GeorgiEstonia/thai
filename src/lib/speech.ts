'use client'

import { useCallback, useSyncExternalStore } from 'react'

import type { PracticeItem } from '@/content/items'

/**
 * Thai pronunciation, spoken by the device.
 *
 * Thai tone is lexical — it is part of how a word is spelled, not something
 * laid over the top — so any voice actually trained on Thai gets it right, and
 * a voice that isn't gets it wrong in ways no amount of tuning fixes. That is
 * the whole reason this uses the platform's own th-TH voice rather than a
 * general multilingual one: iOS and macOS ship a Thai voice, it costs nothing,
 * it needs no API key, and it works offline.
 *
 * If a device has no Thai voice installed the app stays silent and says why,
 * rather than reading Thai script with an English voice — a wrong
 * pronunciation rehearsed daily is worse than no audio at all.
 *
 * Both pieces of state here live outside React, in the browser: whether you
 * muted it (localStorage) and which voices exist (speechSynthesis, which
 * populates asynchronously). useSyncExternalStore is the primitive for exactly
 * that, and it keeps the server render and the first client render agreeing.
 */

const MUTE_KEY = 'thai.muted'

/** Slightly under natural pace: fast enough to sound like speech, slow enough
 *  to hear where the tone moves. */
const RATE = 0.85

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  return window.speechSynthesis
}

// ---------------------------------------------------------------------------
// Muted, remembered per device
// ---------------------------------------------------------------------------

let mutedCache: boolean | null = null
const muteListeners = new Set<() => void>()

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    // Private mode, or a browser refusing site data.
    return false
  }
}

function subscribeMuted(listener: () => void): () => void {
  muteListeners.add(listener)
  return () => muteListeners.delete(listener)
}

function mutedSnapshot(): boolean {
  if (mutedCache === null) mutedCache = readMuted()
  return mutedCache
}

/** Nothing is muted before the browser has said otherwise. */
function mutedServerSnapshot(): boolean {
  return false
}

function storeMuted(muted: boolean): void {
  mutedCache = muted
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // The setting just won't survive a reload.
  }
  for (const listener of muteListeners) listener()
}

// ---------------------------------------------------------------------------
// The Thai voice, if this device has one
// ---------------------------------------------------------------------------

let voiceCache: { voice: SpeechSynthesisVoice | null; loaded: boolean } = {
  voice: null,
  loaded: false,
}

function refreshVoices(): void {
  const speech = synth()
  if (!speech) return

  const voices = speech.getVoices()
  const found = voices.find((voice) => voice.lang.toLowerCase().startsWith('th')) ?? null

  // A new object only when something actually changed: getSnapshot must return
  // a stable reference or React re-renders forever.
  if (voiceCache.voice !== found || voiceCache.loaded !== voices.length > 0) {
    voiceCache = { voice: found, loaded: voices.length > 0 }
  }
}

function subscribeVoices(listener: () => void): () => void {
  const speech = synth()
  if (!speech) return () => {}

  const onChange = () => {
    refreshVoices()
    listener()
  }

  // getVoices() is empty until the list loads, and some browsers only populate
  // it after this event — so a one-off check at mount reports "no Thai voice"
  // on a device that has one.
  refreshVoices()
  speech.addEventListener('voiceschanged', onChange)
  return () => speech.removeEventListener('voiceschanged', onChange)
}

function voiceSnapshot() {
  return voiceCache
}

const VOICE_SERVER_SNAPSHOT = { voice: null, loaded: false }

function voiceServerSnapshot() {
  return VOICE_SERVER_SNAPSHOT
}

// ---------------------------------------------------------------------------

/**
 * What to say for an item.
 *
 * Not always the thing printed on the card. A vowel is written with a dotted
 * circle standing in for the consonant — ◌ั — which is not a syllable and
 * cannot be pronounced, so its example word is spoken instead. A consonant is
 * spoken by its acrophonic name, the way Thais spell out loud: ก is "gɔɔ gài",
 * written กอ ไก่.
 */
export function speechTextFor(item: PracticeItem): string {
  if (item.type === 'vowel') return item.vowel.exampleThai
  if (item.type === 'character') return `${item.character.glyph}อ ${item.character.nameThai}`
  return item.thai
}

export interface Speech {
  /** This device has a Thai voice. */
  available: boolean
  /** Voices have finished loading, so "no Thai voice" isn't reported early. */
  ready: boolean
  muted: boolean
  setMuted: (muted: boolean) => void
  /**
   * Says the text, and reports whether it actually did.
   *
   * The answer matters: voices load asynchronously, so the first card of a
   * session can ask to be spoken before the Thai voice exists. A caller that
   * assumed success would tick that card off as done and leave it silent.
   */
  speak: (text: string) => boolean
}

export function useSpeech(): Speech {
  const muted = useSyncExternalStore(subscribeMuted, mutedSnapshot, mutedServerSnapshot)
  const voices = useSyncExternalStore(subscribeVoices, voiceSnapshot, voiceServerSnapshot)

  const setMuted = useCallback((next: boolean) => {
    storeMuted(next)
    if (next) synth()?.cancel()
  }, [])

  const speak = useCallback(
    (text: string): boolean => {
      const speech = synth()
      if (!speech || muted || !text || !voices.voice) return false

      // Cancel first: flipping quickly through cards otherwise queues them all
      // and the audio ends up running several cards behind the screen.
      speech.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = voices.voice
      utterance.lang = voices.voice.lang
      utterance.rate = RATE
      speech.speak(utterance)
      return true
    },
    [muted, voices.voice],
  )

  return { available: voices.voice !== null, ready: voices.loaded, muted, setMuted, speak }
}
