import Link from 'next/link'

import { DIRECTIONS, cardKey, packGroupId } from '@/content/items'
import PractiseCta from '@/components/PractiseCta'
import { requireAuth } from '@/lib/auth'
import { loadDueSnapshot } from '@/lib/practice'
import { countDuplicateWords, listPacks, listWords } from '@/lib/words'

import AddWordForm from './AddWordForm'
import TidyDuplicates from './TidyDuplicates'
import WordRow from './WordRow'

export const dynamic = 'force-dynamic'

export default async function WordsPage() {
  await requireAuth()
  const [words, packs, { dueByKey, seenKeys }, duplicates] = await Promise.all([
    listWords(),
    listPacks(),
    loadDueSnapshot(),
    countDuplicateWords(),
  ])

  const seen = new Set(seenKeys)
  const due = words.reduce((total, word) => {
    for (const direction of DIRECTIONS) {
      const key = cardKey('word', word.id, direction)
      if (!seen.has(key) || dueByKey[key]) total++
    }
    return total
  }, 0)

  const allPacks = [...new Set(words.map((word) => packGroupId(word.pack)))]
  const practiseHref = `/drill?groups=${encodeURIComponent(allPacks.join(','))}&dirs=recognise,produce`

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      {words.length > 0 ? (
        <>
          <PractiseCta href={practiseHref} due={due} label="Practise words" />
          <div className="mt-3 flex justify-center">
            <Link
              href="/words/practice"
              className="text-xs text-muted underline underline-offset-4"
            >
              choose packs or direction
            </Link>
          </div>
        </>
      ) : null}

      <TidyDuplicates duplicates={duplicates} />

      <div className="mt-8 flex gap-2">
        <Link
          href="/capture"
          className="flex-1 rounded-xl border border-edge py-3 text-center text-sm"
        >
          Photograph
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
