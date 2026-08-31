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

  // Not awaited: the chain runs on its own from here.
  fetch(step.toString(), { method: 'POST' }).catch(() => {})

  return NextResponse.json({ started: true })
}
