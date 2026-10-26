import { cookies } from 'next/headers'

import { CHARACTERS_COOKIE } from './preference-keys'

/**
 * Settings the server needs when it builds a session.
 *
 * In a cookie rather than localStorage, because what goes into practice is
 * decided on the server: the screen has to know how much is waiting before it
 * can offer to practise it, and a value the server cannot read would mean
 * counting one thing and drilling another.
 */

export interface Preferences {
  /** Mix the writing system into ordinary practice. Off unless asked for. */
  characters: boolean
}

export async function readPreferences(): Promise<Preferences> {
  const store = await cookies()
  return { characters: store.get(CHARACTERS_COOKIE)?.value === '1' }
}
