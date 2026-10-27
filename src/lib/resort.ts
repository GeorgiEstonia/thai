import { eq, inArray } from 'drizzle-orm'

import { canonicalTopic } from '@/content/topics'

import { ensureSchema, getDb, schema } from './db'
import { describeKey } from './describe-match'
import { sortIntoPacks } from './extract'

/**
 * Re-filing the topics that were never really topics.
 *
 * Folding twenty-nine names onto thirteen was done by renaming, which was
 * right for the ones that were a single subject under four spellings. It was
 * wrong for two of them, and renaming quietly preserved the mistake:
 *
 *  - "General" and "Everyday extras" were drawers. Their contents had never
 *    been sorted at all, so calling them "Core words and particles" renamed
 *    the drawer rather than emptying it — seventy-five items, most of which
 *    are about something.
 *  - "Family and numbers" was two subjects in one name. Renaming it to
 *    "Family and people" buried every number in the deck, which is why
 *    "Numbers and counting" ended up holding two items.
 *
 * So these topics get sorted word by word against the list, and anything
 * genuinely core stays. A rename cannot put a word somewhere worse than it
 * was; this can, which is why it is limited to topics that are known to be
 * mixtures rather than run over the whole deck.
 */

export const RESORT_ID = 'resort-mixtures-v1'

/** Topics that are a mixture rather than a subject. */
export const MIXED_TOPICS = ['Core words and particles', 'Family and people']

export interface ResortResult {
  /** Rows whose topic changed. */
  moved: number
  /** Rows looked at, including the ones that stayed put. */
  considered: number
  movedTo: { pack: string; count: number }[]
}

export async function resortPending(): Promise<boolean> {
  await ensureSchema()
  const rows = await getDb()
    .select({ id: schema.seedImports.id })
    .from(schema.seedImports)
    .where(eq(schema.seedImports.id, RESORT_ID))
  return rows.length === 0
}

export async function applyResort(): Promise<ResortResult> {
  await ensureSchema()
  const db = getDb()

  const nothing: ResortResult = { moved: 0, considered: 0, movedTo: [] }
  if (!(await resortPending())) return nothing

  const rows = await db
    .select({
      id: schema.words.id,
      thai: schema.words.thai,
      english: schema.words.english,
      kind: schema.words.kind,
      pack: schema.words.pack,
    })
    .from(schema.words)
    .where(inArray(schema.words.pack, MIXED_TOPICS))

  if (rows.length === 0) {
    await mark(db, 0, 0)
    return nothing
  }

  const assignments = await sortIntoPacks(
    rows.map((row) => ({ thai: row.thai, english: row.english, kind: row.kind })),
  )

  // Canonical names only, matched the tolerant way the describe pass is: the
  // model is told to echo the Thai unchanged and mostly does, but a reading
  // appended to it must not silently cost the word its topic.
  const packFor = new Map(
    assignments.flatMap((entry) => {
      const pack = canonicalTopic(entry.pack)
      return pack ? [[describeKey(entry.thai), pack] as const] : []
    }),
  )

  const byPack = new Map<string, string[]>()
  for (const row of rows) {
    const pack = packFor.get(describeKey(row.thai))
    // Unchanged is not a move, and an unfiled word keeps what it had rather
    // than being stranded.
    if (!pack || pack === row.pack) continue
    byPack.set(pack, [...(byPack.get(pack) ?? []), row.id])
  }

  let moved = 0
  for (const [pack, ids] of byPack) {
    for (let start = 0; start < ids.length; start += 200) {
      const slice = ids.slice(start, start + 200)
      await db.update(schema.words).set({ pack }).where(inArray(schema.words.id, slice))
      moved += slice.length
    }
  }

  await mark(db, rows.length, moved)

  return {
    moved,
    considered: rows.length,
    movedTo: [...byPack.entries()]
      .map(([pack, ids]) => ({ pack, count: ids.length }))
      .sort((a, b) => b.count - a.count),
  }
}

async function mark(db: ReturnType<typeof getDb>, items: number, moved: number): Promise<void> {
  await db
    .insert(schema.seedImports)
    .values({ id: RESORT_ID, items, added: moved })
    .onConflictDoNothing()
}
