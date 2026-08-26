import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { processWorksheet } from '@/lib/worksheets'

/**
 * Kicks off reading and checking, then returns immediately. Nothing awaits the
 * work, so you can close the tab — the result lands on the row either way.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'auth' }, { status: 401 })

  const { id } = await params
  void processWorksheet(id)
  return NextResponse.json({ started: true })
}
