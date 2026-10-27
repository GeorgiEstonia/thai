import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { WORD_TOPICS } from '@/content/assignments'
import { TOPICS } from '@/content/topics'

import { __setTestDb, getDb, schema } from './db'
import { buildLexicon } from './practice'
import { applyRefile, refilePending, topicForSentence } from './refile'
import { addWords, listWords } from './words'

/**
 * The filing is written out by hand so it can be read and corrected. These
 * check it is complete and consistent, and that sentences follow the words
 * inside them rather than needing five hundred more decisions.
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

describe('the written assignment', () => {
  it('only ever names a topic that exists', () => {
    const strays = Object.entries(WORD_TOPICS)
      .filter(([, topic]) => !TOPICS.includes(topic))
      .map(([thai]) => thai)
    expect(strays).toEqual([])
  })

  it('covers a serious part of the deck', () => {
    expect(Object.keys(WORD_TOPICS).length).toBeGreaterThan(450)
  })

  it('uses every topic on the list, so none is dead weight', () => {
    const used = new Set(Object.values(WORD_TOPICS))
    expect([...TOPICS].filter((t) => !used.has(t))).toEqual([])
  })
})

describe('topicForSentence', () => {
  const lexicon = buildLexicon([])

  it('files a sentence under what it is about', () => {
    expect(topicForSentence('ขอส้มตำหนึ่งจานค่ะ', lexicon)).toBe('Food and eating')
  })

  it('ignores the core words every sentence is full of', () => {
    // ครับ and ขอ are in all of these; they must not decide anything.
    expect(topicForSentence('ขอกุญแจห้องครับ', lexicon)).toBe('Hotels and travel')
  })

  it('falls back to core words when that is genuinely all there is', () => {
    expect(topicForSentence('พูดอีกครั้งได้ไหมครับ', lexicon)).toBe('Core words and particles')
  })

  it('prefers the longer word when two topics are tied', () => {
    // ห้องสมุด is one word, not ห้อง + สมุด, so this is about the library.
    expect(topicForSentence('ผมไปห้องสมุดกับเพื่อน', lexicon)).not.toBe('Hotels and travel')
  })

  it('gives up rather than guessing at a sentence it cannot split', () => {
    expect(topicForSentence('ไม่มีคำนี้ในพจนานุกรมเลยนะ', lexicon)).toBeNull()
  })
})

describe('applyRefile', () => {
  it('moves a word onto its written topic', async () => {
    await addWords([
      { thai: 'ตลาด', ipa: 'ta.làːt', english: 'market', pack: 'Core words and particles', source: 'manual' },
    ])

    const result = await applyRefile()
    expect(result.moved).toBe(1)
    expect((await listWords())[0].pack).toBe('Shopping and money')
  })

  it('leaves a word already on its topic alone', async () => {
    await addWords([
      { thai: 'ตลาด', ipa: 'ta.làːt', english: 'market', pack: 'Shopping and money', source: 'manual' },
    ])
    expect((await applyRefile()).moved).toBe(0)
  })

  it('files a sentence from the words inside it', async () => {
    await addWords([
      { thai: 'ขอส้มตำหนึ่งจานค่ะ', ipa: '', english: 'one papaya salad please', kind: 'phrase', pack: null, source: 'manual' },
    ])
    await applyRefile()
    expect((await listWords())[0].pack).toBe('Food and eating')
  })

  /**
   * Something imported after this assignment was written has no entry. It
   * keeps whatever the sorter gave it rather than being moved on a guess.
   */
  it('leaves a word it has never heard of where it is', async () => {
    await addWords([
      { thai: 'คำใหม่ที่ยังไม่เคยมี', ipa: '', english: 'a new word', pack: 'Free time', source: 'manual' },
    ])
    const result = await applyRefile()
    expect(result.unknown).toBe(1)
    expect((await listWords())[0].pack).toBe('Free time')
  })

  it('runs once, however many times it is called', async () => {
    await addWords([
      { thai: 'ตลาด', ipa: 'ta.làːt', english: 'market', pack: null, source: 'manual' },
    ])
    expect(await refilePending()).toBe(true)
    expect((await applyRefile()).moved).toBe(1)
    expect(await refilePending()).toBe(false)
    expect((await applyRefile()).moved).toBe(0)
  })
})
