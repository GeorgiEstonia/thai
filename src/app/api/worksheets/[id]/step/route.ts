import { waitUntil } from '@vercel/functions'
import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { signStep, verifyStep } from '@/lib/steps'
import { runStep } from '@/lib/worksheets'

/** One page per request, so no invocation approaches the platform's ceiling. */
export const maxDuration = 300

/**
 * Runs one step, then triggers the next by calling itself.
 *
 * Chaining rather than looping is what keeps a long import alive: each link is
 * a short request, progress is saved after every page, and a link that dies
 * takes only its own page down instead of the whole batch.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = new URL(request.url).searchParams.get('t')

  // Either you kicked it off, or it is the chain calling itself.
  const allowed = verifyStep(id, token) || (await isAuthenticated())
  if (!allowed) return NextResponse.json({ error: 'auth' }, { status: 401 })

  const result = await runStep(id)

  if (!result.done) {
    const next = new URL(request.url)
    next.searchParams.set('t', signStep(id))
    // Fire and forget; waitUntil keeps it alive past this response.
    const chain = fetch(next.toString(), { method: 'POST' }).catch(() => {})
    try {
      waitUntil(chain)
    } catch {
      // Not on Vercel — the request is already in flight.
    }
  }

  return NextResponse.json(result)
}
