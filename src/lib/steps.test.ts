import { beforeEach, describe, expect, it } from 'vitest'

import { signStep, verifyStep } from './steps'

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-secret'
})

describe('step tokens', () => {
  it('accepts a token it just issued for that worksheet', () => {
    expect(verifyStep('sheet-1', signStep('sheet-1'))).toBe(true)
  })

  it('will not run a step for a different worksheet', () => {
    expect(verifyStep('sheet-2', signStep('sheet-1'))).toBe(false)
  })

  it('rejects a missing or malformed token', () => {
    expect(verifyStep('sheet-1', null)).toBe(false)
    expect(verifyStep('sheet-1', 'nonsense')).toBe(false)
    expect(verifyStep('sheet-1', '.abc')).toBe(false)
  })

  it('rejects a tampered signature', () => {
    expect(verifyStep('sheet-1', `${signStep('sheet-1')}0`)).toBe(false)
  })

  it('expires, so a leaked chain link cannot be replayed later', () => {
    const now = Date.now()
    const token = signStep('sheet-1', now)
    expect(verifyStep('sheet-1', token, now + 29 * 60 * 1000)).toBe(true)
    expect(verifyStep('sheet-1', token, now + 31 * 60 * 1000)).toBe(false)
  })

  it('rejects a token dated in the future', () => {
    const now = Date.now()
    expect(verifyStep('sheet-1', signStep('sheet-1', now + 60_000), now)).toBe(false)
  })
})
