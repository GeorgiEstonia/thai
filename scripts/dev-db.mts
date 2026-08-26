/**
 * A local Postgres for development, with no Docker and nothing to install.
 *
 * PGlite is Postgres compiled to WASM; pglite-socket puts it behind a real
 * TCP socket, so the app connects with the ordinary postgres driver and none
 * of the application code knows the difference. Data persists in .pglite/.
 *
 *   npm run db:dev     # leave running in one terminal
 *   npm run db:push    # apply the schema (first run only)
 *   npm run dev
 */

import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

const PORT = Number(process.env.DEV_DB_PORT ?? 5432)

const db = await PGlite.create({ dataDir: './.pglite' })
const server = new PGLiteSocketServer({ db, port: PORT, host: '127.0.0.1' })

await server.start()
console.log(`local postgres listening on 127.0.0.1:${PORT}`)
console.log(`DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres`)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await server.stop()
    await db.close()
    process.exit(0)
  })
}
