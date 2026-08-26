import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { createWorksheet } from '@/lib/worksheets'

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'auth' }, { status: 401 })

  const { pack } = (await request.json()) as { pack?: string | null }
  const id = await createWorksheet(pack?.trim() || null)
  return NextResponse.json({ id })
}
