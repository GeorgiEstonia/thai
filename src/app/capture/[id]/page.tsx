import Link from 'next/link'
import { notFound } from 'next/navigation'

import { requireAuth } from '@/lib/auth'
import { getWorksheet } from '@/lib/worksheets'

import ReviewClient from './ReviewClient'

export const dynamic = 'force-dynamic'

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth()

  const { id } = await params
  const worksheet = await getWorksheet(id)
  if (!worksheet) notFound()

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium">Check the words</h1>
        <Link href="/capture" className="text-sm text-muted underline underline-offset-4">
          Back
        </Link>
      </header>

      <ReviewClient
        key={`${worksheet.status}:${worksheet.extracted?.length ?? 0}`}
        worksheetId={worksheet.id}
        status={worksheet.status}
        images={worksheet.images}
        pack={worksheet.pack}
        extracted={worksheet.extracted ?? []}
        error={worksheet.error}
      />
    </main>
  )
}
