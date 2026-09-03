import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { __setTestDb, getDb, schema } from './db'
import { selectedItems } from './practice'
import {
  addWords,
  deleteWord,
  listPacks,
  listWordItems,
  listWords,
  loadNotes,
  saveNote,
} from './words'

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
  await client.exec('truncate item_progress, review_log, item_notes, words, worksheets cascade')
})

afterAll(async () => {
  __setTestDb(null)
  await client.close()
})

describe('words', () => {
  it('stores and returns a word', async () => {
    await addWords([
      { thai: 'หมา', ipa: 'mǎː', english: 'dog', source: 'manual' },
    ])

    const words = await listWords()
    expect(words).toHaveLength(1)
    expect(words[0]).toMatchObject({ thai: 'หมา', ipa: 'mǎː', english: 'dog' })
  })

  it('trims whitespace and turns blank notes into null', async () => {
    await addWords([
      { thai: '  แมว  ', ipa: ' mɛːw ', english: ' cat ', notes: '   ', source: 'manual' },
    ])

    const [word] = await listWords()
    expect(word.thai).toBe('แมว')
    expect(word.ipa).toBe('mɛːw')
    expect(word.english).toBe('cat')
    expect(word.notes).toBeNull()
  })

  it('adds a whole worksheet batch in one go', async () => {
    const ids = await addWords([
      { thai: 'หนึ่ง', ipa: 'nɯ̀ŋ', english: 'one', source: 'worksheet' },
      { thai: 'สอง', ipa: 'sɔ̌ːŋ', english: 'two', source: 'worksheet' },
    ])
    expect(ids).toHaveLength(2)
    expect(await listWords()).toHaveLength(2)
  })

  it('does nothing when given an empty batch', async () => {
    expect(await addWords([])).toEqual([])
  })

  it('deletes a word', async () => {
    const [id] = await addWords([
      { thai: 'ไป', ipa: 'paj', english: 'to go', source: 'manual' },
    ])
    await deleteWord(id)
    expect(await listWords()).toHaveLength(0)
  })

  it('exposes words as practice items in the shared pool', async () => {
    await addWords([{ thai: 'กิน', ipa: 'kin', english: 'to eat', source: 'manual' }])

    const [item] = await listWordItems()
    expect(item.type).toBe('word')
    expect(item.group).toBe('words')
    expect(item.thai).toBe('กิน')
    expect(item.ipa).toBe('kin')
  })
})

describe('personal mnemonics', () => {
  it('saves and reads back a mnemonic for any item type', async () => {
    await saveNote('character', 'ko-kai', 'chicken head facing left')
    await saveNote('vowel', 'a-long', 'held twice as long')

    const notes = await loadNotes()
    expect(notes.get('character:ko-kai')).toBe('chicken head facing left')
    expect(notes.get('vowel:a-long')).toBe('held twice as long')
  })

  it('overwrites rather than duplicating', async () => {
    await saveNote('character', 'ko-kai', 'first attempt')
    await saveNote('character', 'ko-kai', 'better one')

    const notes = await loadNotes()
    expect(notes.get('character:ko-kai')).toBe('better one')
    expect(notes.size).toBe(1)
  })

  it('trims, and clears the note when the text is emptied', async () => {
    await saveNote('character', 'ko-kai', '   spaced out   ')
    expect((await loadNotes()).get('character:ko-kai')).toBe('spaced out')

    await saveNote('character', 'ko-kai', '   ')
    expect((await loadNotes()).has('character:ko-kai')).toBe(false)
  })
})

describe('packs', () => {
  it('files words under a pack and lists the distinct names', async () => {
    await addWords([
      { thai: 'ก', ipa: 'k', english: 'a', pack: 'Chapter 3', source: 'manual' },
      { thai: 'ข', ipa: 'kʰ', english: 'b', pack: 'Chapter 3', source: 'manual' },
      { thai: 'ค', ipa: 'kʰ', english: 'c', pack: 'Chapter 4', source: 'manual' },
      { thai: 'ง', ipa: 'ŋ', english: 'd', source: 'manual' },
    ])

    expect(await listPacks()).toEqual(['Chapter 3', 'Chapter 4'])
  })

  it('groups word items by pack so a session can be one chapter', async () => {
    await addWords([
      { thai: 'ก', ipa: 'k', english: 'a', pack: 'Chapter 3', source: 'manual' },
      { thai: 'ง', ipa: 'ŋ', english: 'd', source: 'manual' },
    ])

    const groups = (await listWordItems()).map((item) => item.group).sort()
    expect(groups).toEqual(['pack:Chapter 3', 'words'])
  })

  it('stores phrases alongside words', async () => {
    await addWords([
      { thai: 'คุณมีพี่น้องกี่คน', ipa: '', english: 'How many siblings do you have?', kind: 'phrase', source: 'worksheet' },
    ])
    const [word] = await listWords()
    expect(word.kind).toBe('phrase')
  })
})

describe('selecting a pack', () => {
  it('loads the words in that pack, not just ungrouped vocabulary', async () => {
    await addWords([
      { thai: 'ข้าว', ipa: 'kʰâːw', english: 'rice', pack: 'Food', source: 'manual' },
      { thai: 'รถ', ipa: 'rót', english: 'car', pack: 'Travel', source: 'manual' },
      { thai: 'ไป', ipa: 'paj', english: 'to go', source: 'manual' },
    ])

    const picked = await selectedItems({ groups: ['pack:Food'], directions: ['recognise'] })
    expect(picked.map((item) => item.thai)).toEqual(['ข้าว'])
  })

  it('still handles the ungrouped bucket on its own', async () => {
    await addWords([
      { thai: 'ข้าว', ipa: 'kʰâːw', english: 'rice', pack: 'Food', source: 'manual' },
      { thai: 'ไป', ipa: 'paj', english: 'to go', source: 'manual' },
    ])

    const picked = await selectedItems({ groups: ['words'], directions: ['recognise'] })
    expect(picked.map((item) => item.thai)).toEqual(['ไป'])
  })

  it('loads no vocabulary when only sounds are selected', async () => {
    await addWords([{ thai: 'ข้าว', ipa: 'kʰâːw', english: 'rice', pack: 'Food', source: 'manual' }])

    const picked = await selectedItems({ groups: ['k'], directions: ['recognise'] })
    expect(picked.every((item) => item.type === 'character')).toBe(true)
  })
})
