import { requireAuth } from '@/lib/auth'
import { loadDueSnapshot } from '@/lib/practice'

import SelectionClient from './SelectionClient'

export const dynamic = 'force-dynamic'

export default async function PracticePage() {
  await requireAuth()

  const { dueByKey, seenKeys } = await loadDueSnapshot()

  return <SelectionClient dueByKey={dueByKey} seenKeys={seenKeys} />
}
