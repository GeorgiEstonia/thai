import Link from 'next/link'

import { requireAuth } from '@/lib/auth'
import { listPacks, listWords } from '@/lib/words'

import AddWordForm from './AddWordForm'
import WordRow from './WordRow'

export const dynamic = 'force-dynamic'

export default async function WordsPage() {
  await requireAuth()
  const [words, packs] = await Promise.all([listWords(), listPacks()])

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium">Words</h1>
        <div className="flex gap-3 text-sm text-muted">
          <Link href="/capture" className="underline underline-offset-4">
            Photograph
          </Link>
          <Link href="/practice" className="underline underline-offset-4">
            Practise
          </Link>
        </div>
      </header>

      <AddWordForm packs={packs} />

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
