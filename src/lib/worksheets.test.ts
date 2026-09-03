import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { __setTestDb, getDb, schema } from './db'
import { appendPage, createWorksheet, loadPages } from './worksheets'

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
  await client.exec('truncate worksheets cascade')
})

afterAll(async () => {
  __setTestDb(null)
  await client.close()
})

describe('page storage', () => {
  it('keeps pages in order however many there are', async () => {
    const id = await createWorksheet('Chapter 9')
    for (let i = 0; i < 20; i++) await appendPage(id, `data:image/jpeg;base64,PAGE${i}`)

    const pages = await loadPages(id)
    expect(pages).toHaveLength(20)
    expect(pages[0]).toContain('PAGE0')
    expect(pages[19]).toContain('PAGE19')
  })

  it('counts pages on the worksheet as they arrive', async () => {
    const id = await createWorksheet(null)
    expect(await appendPage(id, 'data:image/jpeg;base64,A')).toBe(1)
    expect(await appendPage(id, 'data:image/jpeg;base64,B')).toBe(2)
    expect(await appendPage(id, 'data:image/jpeg;base64,C')).toBe(3)
  })

  it('does not mix pages between batches', async () => {
    const first = await createWorksheet('One')
    const second = await createWorksheet('Two')
    await appendPage(first, 'data:image/jpeg;base64,FIRST')
    await appendPage(second, 'data:image/jpeg;base64,SECOND')

    expect(await loadPages(first)).toEqual(['data:image/jpeg;base64,FIRST'])
    expect(await loadPages(second)).toEqual(['data:image/jpeg;base64,SECOND'])
  })

  it('removes pages with their batch rather than orphaning them', async () => {
    const id = await createWorksheet(null)
    await appendPage(id, 'data:image/jpeg;base64,A')
    await client.exec('truncate worksheets cascade')

    const orphans = await db.select().from(schema.worksheetPages)
    expect(orphans).toHaveLength(0)
  })
})
