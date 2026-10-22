import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { __setTestDb, getDb, schema } from './db'
import { REGROUP_JOB_ID, regroupPending, regroupUngrouped, ungroupedWords } from './regroup'
import { addWords, listWords } from './words'

/**
 * Sorting the ungrouped pile. The model call is stubbed: what matters here is
 * that every answer is applied to the right row, that an item the model drops
 * keeps what it had rather than being guessed at, and that the job runs once.
 */

vi.mock('./extract', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./extract')>()),
  sortIntoPacks: vi.fn(),
}))

const { sortIntoPacks } = await import('./extract')
const mocked = vi.mocked(sortIntoPacks)

const client = new PGlite()
const db = drizzle(client, { schema })
__setTestDb(db as unknown as ReturnType<typeof getDb>)

function migrationSql(): string {
  const dir = path.resolve(process.cwd(), 'drizzle')
  return readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(path.join(dir, file), 'utf8'))
    .join('\n')
}

beforeAll(async () => {
  await client.exec(migrationSql())
})

beforeEach(async () => {
  await client.exec('truncate words, seed_imports cascade')
  mocked.mockReset()
})

afterAll(async () => {
  __setTestDb(null)
  await client.close()
})

const LOOSE = [
  { thai: 'หมา', ipa: 'mǎa', english: 'dog', source: 'manual' as const },
  { thai: 'แมว', ipa: 'mɛɛw', english: 'cat', source: 'manual' as const },
  { thai: 'นก', ipa: 'nók', english: 'bird', source: 'manual' as const },
  { thai: 'กิน', ipa: 'kin', english: 'to eat', source: 'manual' as const },
  { thai: 'ดื่ม', ipa: 'dɯ̀ɯm', english: 'to drink', source: 'manual' as const },
  { thai: 'นอน', ipa: 'nɔɔn', english: 'to sleep', source: 'manual' as const },
]

describe('regroupUngrouped', () => {
  it('finds only the words with no pack', async () => {
    await addWords(LOOSE)
    await addWords([{ thai: 'บ้าน', ipa: 'bâan', english: 'house', pack: 'Home', source: 'manual' }])

    const loose = await ungroupedWords()
    expect(loose).toHaveLength(LOOSE.length)
    expect(loose.some((word) => word.thai === 'บ้าน')).toBe(false)
  })

  it('files each word under the topic it was given', async () => {
    await addWords(LOOSE)
    mocked.mockResolvedValue([
      { thai: 'หมา', pack: 'Animals' },
      { thai: 'แมว', pack: 'Animals' },
      { thai: 'นก', pack: 'Animals' },
      { thai: 'กิน', pack: 'Everyday verbs' },
      { thai: 'ดื่ม', pack: 'Everyday verbs' },
      { thai: 'นอน', pack: 'Everyday verbs' },
    ])

    const result = await regroupUngrouped()
    expect(result.sorted).toBe(6)

    const words = await listWords()
    expect(words.filter((w) => w.pack === 'Animals')).toHaveLength(3)
    expect(words.filter((w) => w.pack === 'Everyday verbs')).toHaveLength(3)
  })

  it('reports the packs it made, largest first', async () => {
    await addWords(LOOSE)
    mocked.mockResolvedValue([
      { thai: 'หมา', pack: 'Animals' },
      { thai: 'แมว', pack: 'Animals' },
      { thai: 'นก', pack: 'Animals' },
      { thai: 'กิน', pack: 'Verbs' },
      { thai: 'ดื่ม', pack: 'Verbs' },
      { thai: 'นอน', pack: 'Sleep' },
    ])

    const result = await regroupUngrouped()
    expect(result.packs[0]).toEqual({ pack: 'Animals', count: 3 })
  })

  it('leaves an item the model skipped exactly as it was', async () => {
    await addWords(LOOSE)
    mocked.mockResolvedValue([{ thai: 'หมา', pack: 'Animals' }])

    const result = await regroupUngrouped()

    expect(result.sorted).toBe(1)
    expect(result.missed).toBe(5)
    expect((await listWords()).filter((w) => w.pack === null)).toHaveLength(5)
  })

  it('still matches when the model appends a reading to the word', async () => {
    await addWords(LOOSE)
    mocked.mockResolvedValue(LOOSE.map((w) => ({ thai: `${w.thai} (${w.ipa})`, pack: 'Animals' })))

    const result = await regroupUngrouped()
    expect(result.sorted).toBe(6)
  })

  it('never touches a word that already had a pack', async () => {
    await addWords(LOOSE)
    await addWords([{ thai: 'บ้าน', ipa: 'bâan', english: 'house', pack: 'Home', source: 'manual' }])
    mocked.mockResolvedValue([{ thai: 'บ้าน', pack: 'Animals' }])

    await regroupUngrouped()

    const house = (await listWords()).find((w) => w.thai === 'บ้าน')
    expect(house?.pack).toBe('Home')
  })

  it('runs once, so a word left loose later does not retrigger it', async () => {
    await addWords(LOOSE)
    mocked.mockResolvedValue(LOOSE.map((w) => ({ thai: w.thai, pack: 'Animals' })))
    await regroupUngrouped()

    mocked.mockClear()
    const second = await regroupUngrouped()

    expect(second.sorted).toBe(0)
    expect(mocked).not.toHaveBeenCalled()
  })

  it('records the job even so it cannot be charged for twice', async () => {
    await addWords(LOOSE)
    mocked.mockResolvedValue(LOOSE.map((w) => ({ thai: w.thai, pack: 'Animals' })))
    await regroupUngrouped()

    const rows = await db.select().from(schema.seedImports)
    expect(rows.map((r) => r.id)).toContain(REGROUP_JOB_ID)
  })

  it('does not call the model for a handful of words', async () => {
    await addWords(LOOSE.slice(0, 2))

    const result = await regroupUngrouped()

    expect(result.sorted).toBe(0)
    expect(mocked).not.toHaveBeenCalled()
  })

  it('reports nothing pending once it has run', async () => {
    await addWords(LOOSE)
    mocked.mockResolvedValue(LOOSE.map((w) => ({ thai: w.thai, pack: 'Animals' })))
    await regroupUngrouped()

    expect(await regroupPending()).toBe(0)
  })
})
