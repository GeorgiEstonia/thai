import Link from 'next/link'

import { requireAuth } from '@/lib/auth'
import { countDuplicateWords, listPacks, listWords } from '@/lib/words'

import AddWordForm from './AddWordForm'
import TidyDuplicates from './TidyDuplicates'
import WordRow from './WordRow'

export const dynamic = 'force-dynamic'

export default async function WordsPage() {
  await requireAuth()
  const [words, packs, duplicates] = await Promise.all([
    listWords(),
    listPacks(),
    countDuplicateWords(),
  ])

  // No practise button here. This screen is the list — somewhere to find and
  // fix a card. Practice is chosen on the practice screen, by topic; a button
  // that drilled the whole deck at once was how a sitting ended up jumping
  // from a direction to an aunt to a plate.

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">

      <TidyDuplicates duplicates={duplicates} />

      <div className="mt-8 flex gap-2">
        <Link
          href="/capture"
          className="flex-1 rounded-xl border border-edge py-3 text-center text-sm"
        >
          Photograph
        </Link>
        <Link
          href="/words/import"
          className="flex-1 rounded-xl border border-edge py-3 text-center text-sm"
        >
          Paste
        </Link>
        <Link
          href="/generate"
          className="flex-1 rounded-xl border border-edge py-3 text-center text-sm"
        >
          Generate
        </Link>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer rounded-xl border border-edge py-3 text-center text-sm">
          Add one by hand
        </summary>
        <AddWordForm packs={packs} />
      </details>

      <p className="mt-8 text-xs uppercase tracking-widest text-muted">
        {words.length} word{words.length === 1 ? '' : 's'}
      </p>

      <ul className="mt-2 divide-y divide-edge">
        {words.map((word) => (
          <WordRow key={word.id} word={word} />
        ))}
      </ul>

      {words.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Nothing yet. Add one above, or{' '}
          <Link href="/capture" className="underline underline-offset-4">
            photograph a lesson page
          </Link>
          .
        </p>
      ) : null}
    </main>
  )
}
