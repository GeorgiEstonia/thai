import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { LESSON_ITEM_COUNT, LESSON_SETS } from '@/content/lessons'

import { __setTestDb, getDb, schema } from './db'
import { applyPendingSeeds, pendingSeeds } from './seed'
import { addWords, listWords } from './words'

/**
 * The vocabulary ships in the code and files itself on the next visit, because
 * the deck cannot be written to from outside. These check it happens exactly
 * once and costs nothing when the words are already there.
 */

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
})

afterAll(async () => {
  __setTestDb(null)
  await client.close()
})

describe('shipped lesson sets', () => {
  it('carries every item that was transcribed', () => {
    const counted = LESSON_SETS.reduce((sum, set) => sum + set.items.length, 0)
    expect(counted).toBe(LESSON_ITEM_COUNT)
    expect(counted).toBeGreaterThan(300)
  })

  it('gives every item Thai, a reading and a meaning', () => {
    for (const set of LESSON_SETS) {
      for (const item of set.items) {
        expect(item.thai).toMatch(/[฀-๿]/)
        expect(item.ipa.trim()).not.toBe('')
        expect(item.english.trim()).not.toBe('')
      }
    }
  })

  it('never repeats a written form across sets', () => {
    const seen = new Set<string>()
    for (const set of LESSON_SETS) {
      for (const item of set.items) {
        expect(seen.has(item.thai)).toBe(false)
        seen.add(item.thai)
      }
    }
  })

  it('files every set under a named pack', () => {
    for (const set of LESSON_SETS) {
      expect(set.pack.trim()).not.toBe('')
      expect(set.id.trim()).not.toBe('')
    }
  })
})

describe('applyPendingSeeds', () => {
  it('files everything on a deck that has none of it', async () => {
    const result = await applyPendingSeeds()

    expect(result.added).toBe(LESSON_ITEM_COUNT)
    expect(await listWords()).toHaveLength(LESSON_ITEM_COUNT)
  })

  it('files each set under its own pack', async () => {
    await applyPendingSeeds()
    const words = await listWords()

    for (const set of LESSON_SETS) {
      const filed = words.filter((word) => word.pack === set.pack)
      expect(filed).toHaveLength(set.items.length)
    }
  })

  it('does nothing at all the second time', async () => {
    await applyPendingSeeds()
    const second = await applyPendingSeeds()

    expect(second.applied).toEqual([])
    expect(second.added).toBe(0)
    expect(await listWords()).toHaveLength(LESSON_ITEM_COUNT)
  })

  it('leaves nothing pending once it has run', async () => {
    await applyPendingSeeds()
    expect(await pendingSeeds()).toEqual([])
  })

  it('does not duplicate a word the deck already had', async () => {
    const existing = LESSON_SETS[0].items[0]
    await addWords([
      { thai: existing.thai, ipa: existing.ipa, english: existing.english, source: 'manual' },
    ])

    const result = await applyPendingSeeds()

    expect(result.added).toBe(LESSON_ITEM_COUNT - 1)
    expect(await listWords()).toHaveLength(LESSON_ITEM_COUNT)
  })

  it('reports what the deck already had rather than hiding it', async () => {
    const set = LESSON_SETS[0]
    // kind matters: a phrase and a word written the same way are different
    // items, so dropping it here would leave the phrases genuinely missing.
    await addWords(
      set.items.map((item) => ({
        thai: item.thai,
        ipa: item.ipa,
        english: item.english,
        kind: item.kind,
        source: 'manual' as const,
      })),
    )

    const result = await applyPendingSeeds()
    const reported = result.applied.find((entry) => entry.id === set.id)

    expect(reported?.added).toBe(0)
    expect(reported?.alreadyHad).toBe(set.items.length)
  })

  it('marks a set done even when it added nothing', async () => {
    const set = LESSON_SETS[0]
    await addWords(
      set.items.map((item) => ({
        thai: item.thai,
        ipa: item.ipa,
        english: item.english,
        kind: item.kind,
        source: 'manual' as const,
      })),
    )

    await applyPendingSeeds()
    // Otherwise it would re-check the same set on every single visit.
    expect((await pendingSeeds()).some((entry) => entry.id === set.id)).toBe(false)
  })

  it('keeps phrases as phrases, so the unlock rule still applies to them', async () => {
    await applyPendingSeeds()
    const words = await listWords()
    const phrases = words.filter((word) => word.kind === 'phrase')

    expect(phrases.length).toBeGreaterThan(20)
  })
})
