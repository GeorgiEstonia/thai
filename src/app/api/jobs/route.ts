import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { activeWorksheets } from '@/lib/worksheets'

export const dynamic = 'force-dynamic'

/** What is still being read, for the background-work indicator. */
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ jobs: [] })
  return NextResponse.json({ jobs: await activeWorksheets() })
}
