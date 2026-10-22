import { requireAuth } from '@/lib/auth'
import { listPacks } from '@/lib/words'

import ImportClient from './ImportClient'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  await requireAuth()
  return <ImportClient packs={await listPacks()} />
}
