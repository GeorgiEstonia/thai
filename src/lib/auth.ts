import { createHmac, timingSafeEqual } from 'node:crypto'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * One user, one passphrase, one signed cookie.
 *
 * This is not an account system and isn't trying to be. The app lives at a
 * public URL, so it needs *something* between it and the open internet; a
 * passphrase you type once per device is the smallest thing that does the job.
 */

const COOKIE_NAME = 'thai_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set — see .env.example`)
  return value
}

function sign(value: string): string {
  return createHmac('sha256', requireEnv('SESSION_SECRET')).update(value).digest('hex')
}

/** Constant-time string comparison that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function issueToken(now: number = Date.now()): string {
  const issuedAt = String(now)
  return `${issuedAt}.${sign(issuedAt)}`
}

export function verifyToken(token: string | undefined, now: number = Date.now()): boolean {
  if (!token) return false

  const separator = token.lastIndexOf('.')
  if (separator <= 0) return false

  const issuedAt = token.slice(0, separator)
  const mac = token.slice(separator + 1)
  if (!safeEqual(mac, sign(issuedAt))) return false

  const ageSeconds = (now - Number(issuedAt)) / 1000
  return Number.isFinite(ageSeconds) && ageSeconds >= 0 && ageSeconds < MAX_AGE_SECONDS
}

export function checkPassphrase(input: string): boolean {
  return safeEqual(input, requireEnv('APP_PASSPHRASE'))
}

export async function startSession(): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_NAME, issueToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function endSession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies()
  return verifyToken(store.get(COOKIE_NAME)?.value)
}

/**
 * Call at the top of every server component and route handler that touches
 * data. Auth is checked here rather than in middleware because middleware runs
 * on the Edge runtime, where node:crypto isn't available.
 */
export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) redirect('/login')
}
