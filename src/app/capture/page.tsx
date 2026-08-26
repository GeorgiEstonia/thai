import Link from 'next/link'

import { requireAuth } from '@/lib/auth'
import { listPacks } from '@/lib/words'
import { listWorksheets } from '@/lib/worksheets'

import CaptureClient from './CaptureClient'

export const dynamic = 'force-dynamic'

export default async function CapturePage() {
  await requireAuth()
  const [worksheets, packs] = await Promise.all([listWorksheets(), listPacks()])

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium">Lesson page</h1>
        <Link href="/words" className="text-sm text-muted underline underline-offset-4">
          Words
        </Link>
      </header>
      <p className="mt-2 text-sm text-muted">
        Photograph whole chapters, then close the tab — reading and checking carry on
        without you. Sentences are kept whole <em>and</em> broken into every word inside
        them, handwritten notes included. Anything that passes the check is filed
        automatically; only doubtful items wait for you.
      </p>

      <CaptureClient packs={packs} />

      {worksheets.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-widest text-muted">Earlier pages</h2>
          <ul className="mt-2 divide-y divide-edge">
            {worksheets.map((sheet) => (
              <li key={sheet.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-muted">
                  {sheet.createdAt.toLocaleDateString()} ·{' '}
                  {sheet.status === 'ready' || sheet.status === 'reviewed'
                    ? `${sheet.autoAdded} added${
                        (sheet.extracted?.filter((item) => !item.added).length ?? 0) > 0
                          ? `, ${sheet.extracted!.filter((item) => !item.added).length} held`
                          : ''
                      }`
                    : sheet.status}
                </span>
                <Link href={`/capture/${sheet.id}`} className="underline underline-offset-4">
                  {sheet.status === 'ready' ? 'review' : 'view'}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}
