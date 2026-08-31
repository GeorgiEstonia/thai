import { describe, expect, it } from 'vitest'

import { needsTls } from './index'

describe('TLS detection', () => {
  it('keeps TLS off for the local dev database', () => {
    expect(needsTls('postgresql://postgres:postgres@127.0.0.1:5432/postgres')).toBe(false)
    expect(needsTls('postgresql://user:pw@localhost:5432/db')).toBe(false)
  })

  it('turns TLS on for hosted databases', () => {
    expect(needsTls('postgresql://user:pw@containers-us-west-1.railway.app:6543/railway')).toBe(
      true,
    )
    expect(needsTls('postgresql://user:pw@ep-cool-name.neon.tech/main')).toBe(true)
  })

  it('is not fooled by a host that merely contains "localhost"', () => {
    expect(needsTls('postgresql://user:pw@localhost.example.com:5432/db')).toBe(true)
  })
})
