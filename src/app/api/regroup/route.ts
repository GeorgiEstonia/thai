import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { regroupPending, regroupUngrouped } from '@/lib/regroup'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Sorts the ungrouped pile into topics. Writes to the deck, so it runs as you. */
export async function POST() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'auth' }, { status: 401 })

  try {
    return NextResponse.json(await regroupUngrouped())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message.slice(0, 200) : 'failed' },
      { status: 500 },
    )
  }
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'auth' }, { status: 401 })
  return NextResponse.json({ pending: await regroupPending() })
}
