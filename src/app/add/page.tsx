import Link from 'next/link'

import { requireAuth } from '@/lib/auth'
import { deckSummary } from '@/lib/words'

export const dynamic = 'force-dynamic'

/**
 * Adding material, in the order it actually happens.
 *
 * A photograph of the whiteboard is how nearly everything gets into this deck,
 * so it is the screen rather than one of four equal tiles on it. The others
 * are real but rare.
 */
export default async function AddPage() {
  await requireAuth()
  const deck = await deckSummary()

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <Link
        href="/capture"
        className="block rounded-2xl bg-foreground px-5 py-6 text-center text-background"
      >
        <span className="block text-lg font-medium">Photograph a lesson</span>
        <span className="block text-xs opacity-70">
          Reads the page, writes examples, files it under a topic
        </span>
      </Link>

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-widest text-muted">Other ways</h2>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Link
            href="/words/import"
            className="rounded-xl border border-edge py-3 text-center text-sm"
          >
            Paste
          </Link>
          <Link href="/generate" className="rounded-xl border border-edge py-3 text-center text-sm">
            Generate
          </Link>
          <Link href="/words" className="rounded-xl border border-edge py-3 text-center text-sm">
            By hand
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <Link href="/words" className="block rounded-xl border border-edge px-3 py-3 text-sm">
          <span className="block">All your words</span>
          <span className="mt-0.5 block text-xs text-muted">
            {deck.words} words and {deck.phrases} sentences in {deck.packs} topics
          </span>
        </Link>
      </section>
    </main>
  )
}
