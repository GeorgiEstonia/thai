import { eq } from 'drizzle-orm'

import { canonicalTopic } from '@/content/topics'

import { ensureSchema, getDb, schema } from './db'

/**
 * Folding the topics that accumulated back onto the list.
 *
 * The deck reached twenty-nine topics for thirteen subjects — four for
 * hotels, three for family, five for food, and a hundred and eighty items
 * spread across "General", "Everyday extras" and nothing at all. None of that
 * was a decision; it is what happens when each import names its own topic
 * without being shown the ones that exist.
 *
 * Renaming rather than re-sorting, because the words were already filed
 * sensibly — "Hotel and staying" and "Hotel reservations & plans" both hold
 * hotel vocabulary. Only the names were wrong, and a rename cannot put a word
 * somewhere worse than it already was.
 */

export const RETOPIC_ID = 'retopic-v1'

export interface RetopicResult {
  /** Rows whose topic changed name. */
  renamed: number
  /** Topic names that match nothing on the list, left as they are. */
  unknown: string[]
}

export async function retopicPending(): Promise<boolean> {
  await ensureSchema()
  const rows = await getDb()
    .select({ id: schema.seedImports.id })
    .from(schema.seedImports)
    .where(eq(schema.seedImports.id, RETOPIC_ID))
  return rows.length === 0
}

export async function applyRetopic(): Promise<RetopicResult> {
  await ensureSchema()
  const db = getDb()

  if (!(await retopicPending())) return { renamed: 0, unknown: [] }

  const rows = await db.select({ pack: schema.words.pack }).from(schema.words)
  const packs = [...new Set(rows.map((row) => row.pack).filter((p): p is string => Boolean(p)))]

  let renamed = 0
  const unknown: string[] = []

  for (const pack of packs) {
    const canonical = canonicalTopic(pack)
    if (!canonical) {
      // Left alone rather than swept into a catch-all. An unrecognised topic
      // is a topic this list has not learned about yet, and moving its words
      // somewhere arbitrary would lose the only grouping they had.
      unknown.push(pack)
      continue
    }
    if (canonical === pack) continue

    const updated = await db
      .update(schema.words)
      .set({ pack: canonical })
      .where(eq(schema.words.pack, pack))
      .returning({ id: schema.words.id })
    renamed += updated.length
  }

  await db
    .insert(schema.seedImports)
    .values({ id: RETOPIC_ID, items: packs.length, added: renamed })
    .onConflictDoNothing()

  return { renamed, unknown }
}
