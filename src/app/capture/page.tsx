import Link from 'next/link'

import { requireAuth } from '@/lib/auth'
import { listWorksheets } from '@/lib/worksheets'

import CaptureClient from './CaptureClient'

export const dynamic = 'force-dynamic'

export default async function CapturePage() {
  await requireAuth()
  const worksheets = await listWorksheets()

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium">Lesson page</h1>
        <Link href="/words" className="text-sm text-muted underline underline-offset-4">
          Words
        </Link>
      </header>
      <p className="mt-2 text-sm text-muted">
        Photograph a page and Claude will read the vocabulary off it. Nothing is added until
        you have checked it.
      </p>

      <CaptureClient />

      {worksheets.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-widest text-muted">Earlier pages</h2>
          <ul className="mt-2 divide-y divide-edge">
            {worksheets.map((sheet) => (
              <li key={sheet.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-muted">
                  {sheet.createdAt.toLocaleDateString()} ·{' '}
                  {sheet.status === 'ready'
                    ? `${sheet.extracted?.length ?? 0} found`
                    : sheet.status}
                </span>
                <Link href={`/capture/${sheet.id}`} className="underline underline-offset-4">
                  {sheet.status === 'reviewed' ? 'view' : 'review'}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}
