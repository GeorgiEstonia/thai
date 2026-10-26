import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { LESSON_SETS } from './src/content/lessons'

const db = await PGlite.create({ dataDir: process.env.PERF_DB_DIR })
const dir = path.resolve(process.cwd(), 'drizzle')
await db.exec(
  readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
    .map((f) => readFileSync(path.join(dir, f), 'utf8')).join('\n'),
)

// The real shipped vocabulary, so row counts and payload sizes match his deck.
let n = 0
for (const set of LESSON_SETS) {
  for (const item of set.items) {
    await db.query(
      `insert into words (thai, ipa, english, kind, pack, source, describe_version,
         example_thai, example_ipa, example_english, context, classifier)
       values ($1,$2,$3,$4,$5,'manual',3,$6,$7,$8,$9,$10)`,
      [item.thai, item.ipa ?? '', item.english, item.kind ?? 'word', set.pack ?? null,
       `${item.thai}ตัวอย่าง`, 'yaang', 'example sentence', 'a usage note', null],
    )
    n++
  }
}
console.log('seeded words:', n)

const server = new PGLiteSocketServer({ db, port: 5557, host: '127.0.0.1' })
await server.start()
console.log('db ready on 5557')
