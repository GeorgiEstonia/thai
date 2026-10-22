import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { applyPendingSeeds, pendingSeeds } from '@/lib/seed'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Files the vocabulary that ships with the app.
 *
 * Behind the same session as everything else: this writes to the deck, so it
 * runs as you, on your own visit, rather than being an open door.
 */
export async function POST() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'auth' }, { status: 401 })

  try {
    return NextResponse.json(await applyPendingSeeds())
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

  const pending = await pendingSeeds()
  return NextResponse.json({
    pending: pending.map((set) => ({ id: set.id, pack: set.pack, items: set.items.length })),
  })
}
