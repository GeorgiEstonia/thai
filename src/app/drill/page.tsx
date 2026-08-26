import Link from 'next/link'

import { requireAuth } from '@/lib/auth'
import { loadDeck, parseSelection } from '@/lib/practice'
import { buildSession } from '@/lib/srs'

import DrillClient from './DrillClient'

export const dynamic = 'force-dynamic'

export default async function DrillPage({
  searchParams,
}: {
  searchParams: Promise<{ groups?: string; dirs?: string }>
}) {
  await requireAuth()

  const selection = parseSelection(await searchParams)
  const now = new Date()
  const deck = await loadDeck(selection, now)

  // Built here rather than in the browser so the shuffle can't differ between
  // the server render and hydration.
  const session = buildSession(
    deck.map((card) => ({ id: card.key, state: card.state })),
    now,
    { maxNew: 10 },
  )

  if (deck.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted">Nothing selected.</p>
        <Link
          href="/practice"
          className="rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background"
        >
          Choose sounds
        </Link>
      </main>
    )
  }

  return (
    <DrillClient
      cards={deck.map(({ key, item, direction, state, note }) => ({ key, item, direction, state, note }))}
      session={session}
    />
  )
}
