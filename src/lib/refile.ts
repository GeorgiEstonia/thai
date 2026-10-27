import { eq, inArray } from 'drizzle-orm'

import { WORD_TOPICS } from '@/content/assignments'
import type { Topic } from '@/content/topics'

import { ensureSchema, getDb, schema } from './db'
import { buildLexicon } from './practice'
import { type Lexicon, segmentThai } from './segment'
import { listWords } from './words'

/**
 * Filing the deck by the assignment written out in content/assignments.ts.
 *
 * The model-sorted version of this is what produced four hotel topics and a
 * hundred and eighty items in drawers, and re-running a model over it would
 * cost money to get another opinion no more trustworthy than the first. The
 * assignment is decided once, by hand, and applied for nothing.
 */

export const REFILE_ID = 'refile-v1'

const CORE: Topic = 'Core words and particles'

export interface RefileResult {
  moved: number
  considered: number
  /** Items with no assignment and no usable sentence — left as they were. */
  unknown: number
  movedTo: { pack: string; count: number }[]
}

export async function refilePending(): Promise<boolean> {
  await ensureSchema()
  const rows = await getDb()
    .select({ id: schema.seedImports.id })
    .from(schema.seedImports)
    .where(eq(schema.seedImports.id, REFILE_ID))
  return rows.length === 0
}

/**
 * The topic of a sentence: the topic of what it is mostly about.
 *
 * A sentence is made of its words, so it does not need an assignment of its
 * own — it needs the rule the sorter was always supposed to follow. Core words
 * are ignored in the count, because every sentence is full of them and a
 * sentence about the market is not about ครับ /kʰráp/.
 *
 * The commonest remaining topic wins, and the longest word breaks a tie: in
 * "I am not free next week", อาทิตย์หน้า is more of what the sentence is about
 * than ว่าง, and it is longer.
 */
export function topicForSentence(thai: string, lexicon: Lexicon): Topic | null {
  const segments = segmentThai(thai, lexicon)
  if (!segments) return null

  const counts = new Map<Topic, { count: number; longest: number }>()

  for (const segment of segments) {
    if (!segment.gloss) continue
    const topic = WORD_TOPICS[segment.text]
    if (!topic || topic === CORE) continue

    const entry = counts.get(topic) ?? { count: 0, longest: 0 }
    entry.count++
    entry.longest = Math.max(entry.longest, segment.text.length)
    counts.set(topic, entry)
  }

  if (counts.size === 0) {
    // Nothing but core words in it — which, for a sentence like
    // "พูดอีกครั้งได้ไหมครับ", is the right answer rather than a failure.
    return segments.some((s) => s.gloss) ? CORE : null
  }

  return [...counts.entries()].sort(
    (a, b) => b[1].count - a[1].count || b[1].longest - a[1].longest,
  )[0][0]
}

export async function applyRefile(): Promise<RefileResult> {
  await ensureSchema()
  const db = getDb()

  if (!(await refilePending())) {
    return { moved: 0, considered: 0, unknown: 0, movedTo: [] }
  }

  const words = await listWords()
  const lexicon = buildLexicon(words)

  const byPack = new Map<Topic, string[]>()
  let unknown = 0

  for (const word of words) {
    const topic =
      word.kind === 'phrase'
        ? topicForSentence(word.thai, lexicon)
        : (WORD_TOPICS[word.thai.trim()] ?? null)

    if (!topic) {
      // Something imported since this assignment was written. Left where it
      // is: the model-driven sorter files new vocabulary, and overruling it
      // here with a guess would be worse than leaving it alone.
      unknown++
      continue
    }
    if (topic === word.pack) continue
    byPack.set(topic, [...(byPack.get(topic) ?? []), word.id])
  }

  let moved = 0
  for (const [pack, ids] of byPack) {
    for (let start = 0; start < ids.length; start += 200) {
      const slice = ids.slice(start, start + 200)
      await db.update(schema.words).set({ pack }).where(inArray(schema.words.id, slice))
      moved += slice.length
    }
  }

  await db
    .insert(schema.seedImports)
    .values({ id: REFILE_ID, items: words.length, added: moved })
    .onConflictDoNothing()

  return {
    moved,
    considered: words.length,
    unknown,
    movedTo: [...byPack.entries()]
      .map(([pack, ids]) => ({ pack, count: ids.length }))
      .sort((a, b) => b.count - a.count),
  }
}
