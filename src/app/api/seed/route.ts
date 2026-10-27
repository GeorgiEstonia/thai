import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { applyResort, resortPending } from '@/lib/resort'
import { applyRetopic, retopicPending } from '@/lib/retopic'
import { applyRevisions, revisionsPending } from '@/lib/revise'
import { applyPendingSeeds, pendingSeeds } from '@/lib/seed'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Files the content that ships with the app: the transcribed vocabulary, and
 * the examples and classifiers written out for it.
 *
 * Behind the same session as everything else: this writes to the deck, so it
 * runs as you, on your own visit, rather than being an open door.
 *
 * Revisions apply after the seeds, so vocabulary filed a moment ago gets its
 * example on the same visit rather than waiting for the next one.
 */
export async function POST() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'auth' }, { status: 401 })

  try {
    const applied = await applyPendingSeeds()
    const revised = await applyRevisions()
    // After the seeds, so vocabulary filed a moment ago is renamed too.
    const retopiced = await applyRetopic()
    // After the rename, which is what leaves the mixtures behind to re-file.
    const resorted = await applyResort()
    return NextResponse.json({ ...applied, revised, retopiced, resorted })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message.slice(0, 200) : 'failed' },
      { status: 500 },
    )
  }
}

/** What is still waiting, without applying it. */
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'auth' }, { status: 401 })

  const [pending, revisions, retopic, resort] = await Promise.all([
    pendingSeeds(),
    revisionsPending(),
    retopicPending(),
    resortPending(),
  ])
  return NextResponse.json({
    pending: pending.map((set) => ({ id: set.id, pack: set.pack, items: set.items.length })),
    revisions,
    retopic,
    resort,
  })
}
