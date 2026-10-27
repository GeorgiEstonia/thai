import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { __setTestDb, getDb, schema } from './db'
import { applyResort, resortPending } from './resort'
import { addWords, listWords } from './words'

/**
 * Renaming the twenty-nine topics onto thirteen was right for the ones that
 * were a single subject under several spellings, and wrong for two: the
 * drawers, whose contents had never been sorted at all, and "Family and
 * numbers", which was two subjects in one name. These check that those get
 * filed word by word rather than renamed.
 */

vi.mock('./extract', () => ({ sortIntoPacks: vi.fn() }))
const { sortIntoPacks } = await import('./extract')
const mocked = vi.mocked(sortIntoPacks)

const client = new PGlite()
const db = drizzle(client, { schema })
__setTestDb(db as unknown as ReturnType<typeof getDb>)

beforeAll(async () => {
  const dir = path.resolve(process.cwd(), 'drizzle')
  await client.exec(
    readdirSync(dir)
      .filter((file) => file.endsWith('.sql'))
      .sort()
      .map((file) => readFileSync(path.join(dir, file), 'utf8'))
      .join('\n'),
  )
})

beforeEach(async () => {
  await client.exec('truncate words, seed_imports cascade')
  mocked.mockReset()
})

afterAll(async () => {
  __setTestDb(null)
  await client.close()
})

/** A number stranded in the family topic, and a genuine particle beside it. */
const MIXED = [
  { thai: 'หนึ่ง', ipa: 'nɯ̀ŋ', english: 'one', pack: 'Family and people', source: 'manual' as const },
  { thai: 'แม่', ipa: 'mɛ̂ː', english: 'mother', pack: 'Family and people', source: 'manual' as const },
  { thai: 'นะ', ipa: 'ná', english: 'softening particle', pack: 'Core words and particles', source: 'manual' as const },
  { thai: 'ตลาด', ipa: 'ta.làːt', english: 'market', pack: 'Core words and particles', source: 'manual' as const },
]

describe('applyResort', () => {
  it('moves a word out of a topic it never belonged in', async () => {
    await addWords(MIXED)
    mocked.mockResolvedValue([
      { thai: 'หนึ่ง', pack: 'Numbers and counting' },
      { thai: 'แม่', pack: 'Family and people' },
      { thai: 'นะ', pack: 'Core words and particles' },
      { thai: 'ตลาด', pack: 'Shopping and money' },
    ])

    const result = await applyResort()
    expect(result.considered).toBe(4)
    expect(result.moved).toBe(2)

    const byThai = new Map((await listWords()).map((w) => [w.thai, w.pack]))
    expect(byThai.get('หนึ่ง')).toBe('Numbers and counting')
    expect(byThai.get('ตลาด')).toBe('Shopping and money')
  })

  it('leaves a word that is genuinely where it belongs', async () => {
    await addWords(MIXED)
    mocked.mockResolvedValue([
      { thai: 'นะ', pack: 'Core words and particles' },
      { thai: 'แม่', pack: 'Family and people' },
    ])

    await applyResort()
    const byThai = new Map((await listWords()).map((w) => [w.thai, w.pack]))
    expect(byThai.get('นะ')).toBe('Core words and particles')
    expect(byThai.get('แม่')).toBe('Family and people')
  })

  /** Only the mixtures. Re-sorting a topic that is already a subject could
   *  only move words somewhere worse. */
  it('never touches a topic that was not a mixture', async () => {
    await addWords([
      { thai: 'ปวดหัว', ipa: 'pùat hǔa', english: 'headache', pack: 'Health and the body', source: 'manual' },
    ])
    mocked.mockResolvedValue([{ thai: 'ปวดหัว', pack: 'Free time' }])

    await applyResort()
    expect((await listWords())[0].pack).toBe('Health and the body')
  })

  it('refuses a topic that is not on the list, keeping what the word had', async () => {
    await addWords(MIXED)
    mocked.mockResolvedValue([{ thai: 'ตลาด', pack: 'Markets & bargaining' }])

    const result = await applyResort()
    expect(result.moved).toBe(0)
    const byThai = new Map((await listWords()).map((w) => [w.thai, w.pack]))
    expect(byThai.get('ตลาด')).toBe('Core words and particles')
  })

  it('runs once, however many times it is called', async () => {
    await addWords(MIXED)
    mocked.mockResolvedValue([{ thai: 'หนึ่ง', pack: 'Numbers and counting' }])

    expect(await resortPending()).toBe(true)
    expect((await applyResort()).moved).toBe(1)
    expect(await resortPending()).toBe(false)
    expect((await applyResort()).moved).toBe(0)
    expect(mocked).toHaveBeenCalledTimes(1)
  })

  it('does nothing, and says so, when there is no mixture left', async () => {
    await addWords([
      { thai: 'ปวดหัว', ipa: 'pùat hǔa', english: 'headache', pack: 'Health and the body', source: 'manual' },
    ])
    const result = await applyResort()
    expect(result).toEqual({ moved: 0, considered: 0, movedTo: [] })
    expect(mocked).not.toHaveBeenCalled()
  })
})
