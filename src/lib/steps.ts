import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Extraction runs as a chain of one-page steps, each its own request, so no
 * single invocation can outrun the platform's function timeout.
 *
 * A step triggers the next by calling back into the app, which means that
 * request arrives with no session cookie. It carries this signed token
 * instead — scoped to one worksheet, and short-lived.
 */

const TTL_MS = 30 * 60 * 1000

function secret(): string {
  const value = process.env.SESSION_SECRET
  if (!value) throw new Error('SESSION_SECRET is not set')
  return value
}

export function signStep(worksheetId: string, now: number = Date.now()): string {
  const issued = String(now)
  const mac = createHmac('sha256', secret()).update(`${worksheetId}.${issued}`).digest('hex')
  return `${issued}.${mac}`
}

export function verifyStep(
  worksheetId: string,
  token: string | null,
  now: number = Date.now(),
): boolean {
  if (!token) return false

  const separator = token.lastIndexOf('.')
  if (separator <= 0) return false

  const issued = token.slice(0, separator)
  const mac = token.slice(separator + 1)
  const expected = createHmac('sha256', secret()).update(`${worksheetId}.${issued}`).digest('hex')

  const a = Buffer.from(mac, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false

  const age = now - Number(issued)
  return Number.isFinite(age) && age >= 0 && age < TTL_MS
}
