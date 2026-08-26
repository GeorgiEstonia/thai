import { beforeEach, describe, expect, it } from 'vitest'

import { checkPassphrase, issueToken, verifyToken } from './auth'

const YEAR_MS = 365 * 24 * 60 * 60 * 1000

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-secret'
  process.env.APP_PASSPHRASE = 'open sesame'
})

describe('session tokens', () => {
  it('accepts a token it just issued', () => {
    expect(verifyToken(issueToken())).toBe(true)
  })

  it('rejects a missing or malformed token', () => {
    expect(verifyToken(undefined)).toBe(false)
    expect(verifyToken('')).toBe(false)
    expect(verifyToken('nonsense')).toBe(false)
    expect(verifyToken('.abc')).toBe(false)
  })

  it('rejects a tampered signature', () => {
    const token = issueToken()
    expect(verifyToken(`${token}0`)).toBe(false)
  })

  it('rejects a token whose timestamp was edited to look newer', () => {
    const issued = Date.now() - 10_000
    const token = issueToken(issued)
    const forged = `${issued + 5_000}.${token.split('.')[1]}`
    expect(verifyToken(forged)).toBe(false)
  })

  it('rejects a token signed with a different secret', () => {
    const token = issueToken()
    process.env.SESSION_SECRET = 'another-secret'
    expect(verifyToken(token)).toBe(false)
  })

  it('expires after a year', () => {
    const now = Date.now()
    const token = issueToken(now)
    expect(verifyToken(token, now + YEAR_MS - 1000)).toBe(true)
    expect(verifyToken(token, now + YEAR_MS + 1000)).toBe(false)
  })

  it('rejects a token dated in the future', () => {
    const now = Date.now()
    expect(verifyToken(issueToken(now + 60_000), now)).toBe(false)
  })
})

describe('passphrase', () => {
  it('accepts the configured passphrase and nothing else', () => {
    expect(checkPassphrase('open sesame')).toBe(true)
    expect(checkPassphrase('open sesam')).toBe(false)
    expect(checkPassphrase('open sesame ')).toBe(false)
    expect(checkPassphrase('')).toBe(false)
  })
})
