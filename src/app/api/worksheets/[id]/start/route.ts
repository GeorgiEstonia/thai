import { waitUntil } from '@vercel/functions'
import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { processWorksheet } from '@/lib/worksheets'

/**
 * Reading a chapter with Opus takes a while, so give the function real room.
 * Vercel caps this by plan — 60s on Hobby, 300s on Pro.
 */
export const maxDuration = 300

/**
 * Kicks off reading and checking, then returns immediately.
 *
 * `waitUntil` is what makes this survive on serverless: a bare floating promise
 * is killed the moment the response is sent, so the work would silently never
 * happen in production. Locally it is a no-op and the promise runs anyway.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'auth' }, { status: 401 })

  const { id } = await params
  const work = processWorksheet(id)

  try {
    waitUntil(work)
  } catch {
    // Not running on Vercel — the promise is already in flight.
  }

  return NextResponse.json({ started: true })
}
