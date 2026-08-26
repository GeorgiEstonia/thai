import { requireAuth } from '@/lib/auth'
import { loadDueSnapshot } from '@/lib/practice'
import { listWords } from '@/lib/words'

import SelectionClient from './SelectionClient'

export const dynamic = 'force-dynamic'

export default async function PracticePage() {
  await requireAuth()

  const [{ dueByKey, seenKeys }, words] = await Promise.all([loadDueSnapshot(), listWords()])

  return (
    <SelectionClient
      dueByKey={dueByKey}
      seenKeys={seenKeys}
      words={words.map((word) => ({ id: word.id, thai: word.thai }))}
    />
  )
}
