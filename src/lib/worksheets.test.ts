import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { eq } from 'drizzle-orm'

import { __setTestDb, getDb, schema } from './db'
import {
  UPLOAD_GRACE_MS,
  activeWorksheets,
  appendPage,
  createWorksheet,
  getWorksheet,
  loadPages,
  runStep,
  sealWorksheet,
} from './worksheets'

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

/**
 * The bug these cover: nothing ever told the server that uploading had
 * finished, so the background stall-checker treated a batch that was still
 * receiving pages as a dead job, kicked off extraction, and read only the
 * pages that happened to have landed. Nine phone photos take longer than the
 * ninety-second stall window; two do not — which is why it looked intermittent
 * and size-dependent.
 */
describe('uploading is not a stalled step', () => {
  async function ageWorksheet(id: string, ms: number) {
    await db
      .update(schema.worksheets)
      .set({ createdAt: new Date(Date.now() - ms) })
      .where(eq(schema.worksheets.id, id))
  }

  it('does not report a long upload as stalled', async () => {
    const id = await createWorksheet(null)
    await appendPage(id, 'data:image/jpeg;base64,A')
    // Well past the step-stall window, but a browser is still feeding it.
    await ageWorksheet(id, 10 * 60 * 1000)

    const [job] = await activeWorksheets()
    expect(job.status).toBe('uploading')
    expect(job.stalled).toBe(false)
  })

  it('gives up on an upload that was genuinely abandoned', async () => {
    const id = await createWorksheet(null)
    await appendPage(id, 'data:image/jpeg;base64,A')
    await ageWorksheet(id, UPLOAD_GRACE_MS + 1000)

    const [job] = await activeWorksheets()
    expect(job.stalled).toBe(true)
  })

  it('refuses to read a batch that has not been sealed', async () => {
    const id = await createWorksheet(null)
    await appendPage(id, 'data:image/jpeg;base64,A')

    const result = await runStep(id)
    expect(result).toEqual({ done: true, status: 'uploading' })

    // Nothing was consumed, so the pages still uploading are still unread.
    const sheet = await getWorksheet(id)
    expect(sheet?.pagesDone).toBe(0)
    expect(sheet?.status).toBe('uploading')
  })

  it('reads every page when the seal comes after the last one', async () => {
    const id = await createWorksheet(null)
    for (let i = 0; i < 9; i++) await appendPage(id, `data:image/jpeg;base64,PAGE${i}`)
    await sealWorksheet(id)

    const sheet = await getWorksheet(id)
    expect(sheet?.status).toBe('extracting')
    expect(sheet?.pageCount).toBe(9)
  })

  it('will not rewind a batch that has already moved past uploading', async () => {
    const id = await createWorksheet(null)
    await appendPage(id, 'data:image/jpeg;base64,A')
    await db
      .update(schema.worksheets)
      .set({ status: 'verifying' })
      .where(eq(schema.worksheets.id, id))

    await sealWorksheet(id)

    expect((await getWorksheet(id))?.status).toBe('verifying')
  })
})
