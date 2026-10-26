import { and, eq } from 'drizzle-orm'

import { REVISIONS, REVISION_ID, type Revision } from '@/content/revisions'

import { ensureSchema, getDb, schema } from './db'
import { DESCRIBE_VERSION } from './extract'

/**
 * Filling in the deck by hand, rather than paying a model to do it again.
 *
 * Most of the vocabulary arrived without an example sentence, and the notes
 * that did exist were written under a prompt that allowed a Thai word to be
 * printed with no reading beside it — which, for someone still learning the
 * script, is a note that cannot be read at all. The describe pipeline fixes
 * both, but it bills per item and the content is better written once,
 * carefully, than generated twice.
 *
 * So the revisions ship as code and the app applies them to itself, the same
 * way the transcribed lessons do: there is no way to write to the hosted
 * database from outside the app.
 *
 * Matched on spelling, because ids are assigned by the database and differ
 * between the deck and anything written here.
 */

export interface RevisionResult {
  /** Rows actually updated. More than REVISIONS.length if the deck has duplicates. */
  updated: number
  /** Revisions whose word is not in the deck — written for an entry since deleted. */
  unmatched: string[]
}

/** True once this set has been applied, so it costs one query thereafter. */
export async function revisionsPending(): Promise<boolean> {
  await ensureSchema()
  const rows = await getDb()
    .select({ id: schema.seedImports.id })
    .from(schema.seedImports)
    .where(eq(schema.seedImports.id, REVISION_ID))
  return rows.length === 0
}

function fieldsOf(revision: Revision) {
  return {
    exampleThai: revision.exampleThai.trim(),
    exampleIpa: revision.exampleIpa.trim(),
    exampleEnglish: revision.exampleEnglish.trim(),
    classifier: revision.classifier?.trim() || null,
    context: revision.context?.trim() || null,
    // Marked current, so the paid pipeline does not come back and rewrite
    // these — the whole point is that they are already right.
    describeVersion: DESCRIBE_VERSION,
  }
}

export async function applyRevisions(): Promise<RevisionResult> {
  await ensureSchema()
  const db = getDb()

  if (!(await revisionsPending())) return { updated: 0, unmatched: [] }

  const existing = await db
    .select({ thai: schema.words.thai, kind: schema.words.kind })
    .from(schema.words)
  const present = new Set(existing.map((row) => `${row.kind}:${row.thai.trim()}`))

  let updated = 0
  const unmatched: string[] = []

  for (const revision of REVISIONS) {
    const kind = revision.kind ?? 'word'
    if (!present.has(`${kind}:${revision.thai.trim()}`)) {
      unmatched.push(revision.thai)
      continue
    }

    // Every row with this spelling, not just the first: a word imported twice
    // from two worksheets should not end up with one good card and one blank.
    const rows = await db
      .update(schema.words)
      .set(fieldsOf(revision))
      .where(and(eq(schema.words.thai, revision.thai.trim()), eq(schema.words.kind, kind)))
      .returning({ id: schema.words.id })
    updated += rows.length
  }

  await db
    .insert(schema.seedImports)
    .values({ id: REVISION_ID, items: REVISIONS.length, added: updated })
    .onConflictDoNothing()

  return { updated, unmatched }
}

/** Deck entries this set does not cover, so the gap is visible rather than assumed. */
export async function revisionCoverage(): Promise<{ covered: number; uncovered: number }> {
  await ensureSchema()
  const rows = await getDb()
    .select({ thai: schema.words.thai, kind: schema.words.kind })
    .from(schema.words)

  const written = new Set(REVISIONS.map((r) => `${r.kind ?? 'word'}:${r.thai.trim()}`))
  let covered = 0
  for (const row of rows) if (written.has(`${row.kind}:${row.thai.trim()}`)) covered++
  return { covered, uncovered: rows.length - covered }
}
