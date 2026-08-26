import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { appendPage } from '@/lib/worksheets'

/**
 * One page per request. Route handlers have no server-action body cap, and
 * keeping each request small is what makes a twelve-page batch work at all.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'auth' }, { status: 401 })

  const { id } = await params
  const { image } = (await request.json()) as { image?: string }
  if (!image?.startsWith('data:image/')) {
    return NextResponse.json({ error: 'expected an image data URL' }, { status: 400 })
  }

  const count = await appendPage(id, image)
  return NextResponse.json({ pages: count })
}
