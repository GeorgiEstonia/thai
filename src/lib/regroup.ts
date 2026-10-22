import { eq, inArray, isNull } from 'drizzle-orm'

import { describeKey } from './describe-match'
import { ensureSchema, getDb, schema } from './db'
import { sortIntoPacks } from './extract'

/**
 * Sorting the ungrouped pile into topics, once.
 *
 * Imports only started naming their own topic recently, so everything filed
 * before that landed with no pack at all — most of the deck. A deck you cannot
 * pick a topic out of is one you can only ever practise whole, which is the
 * opposite of what packs are for.
 *
 * This is a one-off tidy of what is already there, not a standing rule: new
 * imports name themselves on the way in.
 */

/** Marks the job done, so a word left ungrouped later doesn't retrigger it. */
export const REGROUP_JOB_ID = 'regroup-ungrouped-v1'

/** Below this it isn't worth a model call — put them in a pack by hand. */
const WORTH_SORTING = 5

export interface RegroupResult {
  sorted: number
  packs: { pack: string; count: number }[]
  /** Items the model didn't return, left as they were rather than guessed at. */
  missed: number
}

async function alreadyRun(): Promise<boolean> {
  const rows = await getDb()
    .select({ id: schema.seedImports.id })
    .from(schema.seedImports)
    .where(eq(schema.seedImports.id, REGROUP_JOB_ID))
  return rows.length > 0
}

/** Vocabulary with no pack, which is what this exists to empty. */
export async function ungroupedWords() {
  await ensureSchema()
  return getDb()
    .select({
      id: schema.words.id,
      thai: schema.words.thai,
      english: schema.words.english,
      kind: schema.words.kind,
    })
    .from(schema.words)
    .where(isNull(schema.words.pack))
}

/** How much is left to sort, without doing anything about it. */
export async function regroupPending(): Promise<number> {
  if (await alreadyRun()) return 0
  const loose = await ungroupedWords()
  return loose.length >= WORTH_SORTING ? loose.length : 0
}

export async function regroupUngrouped(): Promise<RegroupResult> {
  const db = getDb()

  if (await alreadyRun()) return { sorted: 0, packs: [], missed: 0 }

  const loose = await ungroupedWords()
  if (loose.length < WORTH_SORTING) return { sorted: 0, packs: [], missed: 0 }

  const assignments = await sortIntoPacks(
    loose.map((word) => ({ thai: word.thai, english: word.english, kind: word.kind })),
  )

  // Matched the same tolerant way as the describe pass: the model is told to
  // echo the Thai unchanged, and mostly does, but a reading appended to it
  // must not silently cost the word its topic.
  const packFor = new Map(assignments.map((entry) => [describeKey(entry.thai), entry.pack.trim()]))

  const byPack = new Map<string, string[]>()
  for (const word of loose) {
    const pack = packFor.get(describeKey(word.thai))
    if (!pack) continue
    byPack.set(pack, [...(byPack.get(pack) ?? []), word.id])
  }

  let sorted = 0
  for (const [pack, ids] of byPack) {
    // In batches: a single update with hundreds of bound parameters is asking
    // for trouble on a hosted database.
    for (let start = 0; start < ids.length; start += 200) {
      const slice = ids.slice(start, start + 200)
      await db.update(schema.words).set({ pack }).where(inArray(schema.words.id, slice))
      sorted += slice.length
    }
  }

  await db
    .insert(schema.seedImports)
    .values({ id: REGROUP_JOB_ID, items: loose.length, added: sorted })
    .onConflictDoNothing()

  return {
    sorted,
    packs: [...byPack.entries()]
      .map(([pack, ids]) => ({ pack, count: ids.length }))
      .sort((a, b) => b.count - a.count),
    missed: loose.length - sorted,
  }
}
