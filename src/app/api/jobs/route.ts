import { waitUntil } from '@vercel/functions'
import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { signStep } from '@/lib/steps'
import { activeWorksheets, reviveStalled } from '@/lib/worksheets'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * What is still being read — and, while we are here, a nudge for anything that
 * has gone quiet.
 *
 * The app polls this every few seconds whenever it is open, so this doubles as
 * the recovery mechanism: a chain link lost to a cold start or a killed
 * function costs a few seconds rather than the whole import.
 */
export async function GET(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ jobs: [] })

  const jobs = await activeWorksheets()

  if (jobs.some((job) => job.stalled)) {
    const origin = new URL(request.url).origin
    const revive = reviveStalled(origin, signStep)
    try {
      waitUntil(revive)
    } catch {
      // Not on Vercel — already running.
    }
  }

  return NextResponse.json({ jobs })
}
