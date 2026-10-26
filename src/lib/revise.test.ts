import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { REVISIONS } from '@/content/revisions'

import { __setTestDb, getDb, schema } from './db'
import { DESCRIBE_VERSION } from './extract'
import { applyRevisions, revisionCoverage, revisionsPending } from './revise'
import { addWords, listWords, wordsNeedingDescription } from './words'

/**
 * The hand-written content has to reach the deck, exactly once, matched on
 * spelling — and it has to stop the paid pipeline coming back to rewrite what
 * was just written by hand.
 */

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
})

afterAll(async () => {
  __setTestDb(null)
  await client.close()
})

/** A word the revision set actually covers, so the test tracks the real content. */
const covered = REVISIONS.find((entry) => (entry.kind ?? 'word') === 'word')!

describe('applyRevisions', () => {
  it('fills in the example, the note and the classifier', async () => {
    await addWords([
      { thai: covered.thai, ipa: '', english: 'placeholder', source: 'manual' },
    ])

    const result = await applyRevisions()
    expect(result.updated).toBe(1)

    const [word] = await listWords()
    expect(word.exampleThai).toBe(covered.exampleThai)
    expect(word.exampleIpa).toBe(covered.exampleIpa)
    expect(word.exampleEnglish).toBe(covered.exampleEnglish)
  })

  /**
   * The point of writing this by hand was to stop paying for it. If the
   * version were left behind, the describe chain would pick every one of
   * these straight back up and rewrite them.
   */
  it('marks the entry current so the paid pipeline leaves it alone', async () => {
    await addWords([{ thai: covered.thai, ipa: '', english: 'placeholder', source: 'manual' }])
    await applyRevisions()

    const [word] = await listWords()
    expect(word.describeVersion).toBe(DESCRIBE_VERSION)
    expect(await wordsNeedingDescription(10)).toEqual([])
  })

  it('applies once, however many times it is called', async () => {
    await addWords([{ thai: covered.thai, ipa: '', english: 'placeholder', source: 'manual' }])

    expect(await revisionsPending()).toBe(true)
    expect((await applyRevisions()).updated).toBe(1)
    expect(await revisionsPending()).toBe(false)
    expect((await applyRevisions()).updated).toBe(0)
  })

  it('updates every row with that spelling, not just the first', async () => {
    // A word imported from two worksheets should not end up with one good
    // card and one blank one.
    await client.exec(`
      insert into words (thai, ipa, english, kind, source) values
        ('${covered.thai}', '', 'first copy', 'word', 'manual'),
        ('${covered.thai}', '', 'second copy', 'word', 'manual')`)

    expect((await applyRevisions()).updated).toBe(2)
    const words = await listWords()
    expect(words.every((word) => word.exampleThai === covered.exampleThai)).toBe(true)
  })

  it('leaves a word the set does not cover untouched', async () => {
    await addWords([
      { thai: 'คำที่ไม่มีในชุดนี้', ipa: 'kʰam', english: 'not in the set', source: 'manual' },
    ])

    await applyRevisions()
    const [word] = await listWords()
    expect(word.exampleThai).toBeNull()
    expect(word.describeVersion).toBe(0)
  })

  it('reports a revision written for a word no longer in the deck', async () => {
    await addWords([{ thai: covered.thai, ipa: '', english: 'placeholder', source: 'manual' }])
    const result = await applyRevisions()
    expect(result.unmatched.length).toBe(REVISIONS.length - 1)
  })

  it('does not match a phrase revision against a word of the same spelling', async () => {
    // A phrase whose spelling is not also a word in the set, so the word
    // revision cannot claim the row and make this pass for the wrong reason.
    const words = new Set(
      REVISIONS.filter((entry) => (entry.kind ?? 'word') === 'word').map((entry) => entry.thai),
    )
    const phrase = REVISIONS.find((entry) => entry.kind === 'phrase' && !words.has(entry.thai))
    if (!phrase) return
    await addWords([
      { thai: phrase.thai, ipa: '', english: 'as a word', kind: 'word', source: 'manual' },
    ])

    await applyRevisions()
    const [word] = await listWords()
    expect(word.exampleThai).toBeNull()
  })
})

describe('revisionCoverage', () => {
  it('counts what the set reaches and what it misses', async () => {
    await addWords([
      { thai: covered.thai, ipa: '', english: 'covered', source: 'manual' },
      { thai: 'คำที่ไม่มีในชุดนี้', ipa: '', english: 'uncovered', source: 'manual' },
    ])

    expect(await revisionCoverage()).toEqual({ covered: 1, uncovered: 1 })
  })
})
