import Link from 'next/link'

import { requireAuth } from '@/lib/auth'
import { SENTENCE_STAGE, loadDeck, parseSelection } from '@/lib/practice'
import { MAX_NEW_SENTENCES, buildSession } from '@/lib/srs'

import DrillClient from './DrillClient'

export const dynamic = 'force-dynamic'

export default async function DrillPage({
  searchParams,
}: {
  searchParams: Promise<{ groups?: string; dirs?: string; kind?: string }>
}) {
  await requireAuth()

  const selection = parseSelection(await searchParams)
  const now = new Date()
  const deck = await loadDeck(selection, now)

  // Built here rather than in the browser so the shuffle can't differ between
  // the server render and hydration.
  //
  // No cap on new words: you chose exactly what to practise on the previous
  // screen, so silently dropping most of it is wrong.
  //
  // Sentences are capped, though, and that cap is the other half of opening
  // the gate. A sentence may now arrive with two or three words you have
  // never studied, and there are a few hundred of them — uncapped, the first
  // sitting after the change would be a wall rather than a session.
  const session = buildSession(
    deck.map((card) => ({
      id: card.key,
      state: card.state,
      stage: card.stage,
      lane: card.lane,
    })),
    now,
    {
      maxNew: Number.POSITIVE_INFINITY,
      maxNewPerStage: { [SENTENCE_STAGE]: MAX_NEW_SENTENCES },
    },
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
      cards={deck.map(
        ({ key, item, direction, state, note, exampleTokens, thaiTokens, noteTokens, newWords }) => ({
          key,
          item,
          direction,
          state,
          note,
          exampleTokens,
          thaiTokens,
          noteTokens,
          newWords,
        }),
      )}
      session={session}
    />
  )
}
