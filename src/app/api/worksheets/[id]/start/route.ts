import { waitUntil } from '@vercel/functions'
import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { signStep } from '@/lib/steps'

export const maxDuration = 60

/**
 * Starts the extraction chain and returns at once, so you can close the tab or
 * carry on using the app while it runs.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'auth' }, { status: 401 })

  const { id } = await params
  const step = new URL(request.url)
  step.pathname = step.pathname.replace(/\/start$/, '/step')
  step.searchParams.set('t', signStep(id))

  // waitUntil is what actually gets this request out of the door. Without it
  // the floating fetch is killed the instant this response returns, the chain
  // never starts, and the batch sits in "uploading" forever — which is exactly
  // what happened to every large import.
  const kick = fetch(step.toString(), { method: 'POST' }).catch(() => {})
  try {
    waitUntil(kick)
  } catch {
    // Not on Vercel — the request is already in flight.
  }

  return NextResponse.json({ started: true })
}
