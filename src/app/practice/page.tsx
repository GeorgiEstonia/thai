import { PRACTICE_ITEMS, DIRECTIONS, cardKey } from '@/content/items'
import PractiseCta from '@/components/PractiseCta'
import { requireAuth } from '@/lib/auth'
import { loadDueSnapshot } from '@/lib/practice'
import { countDuplicateWords } from '@/lib/words'

import TidyDuplicates from '@/app/words/TidyDuplicates'

import SelectionClient from './SelectionClient'

export const dynamic = 'force-dynamic'

export default async function PracticePage() {
  await requireAuth()

  // This is the screen the app opens on, so it is where a deck that needs
  // tidying will actually be found.
  const [{ dueByKey, seenKeys }, duplicates] = await Promise.all([
    loadDueSnapshot(),
    countDuplicateWords(),
  ])
  const seen = new Set(seenKeys)

  // Everything waiting: reviews that have come due, plus anything never
  // started. Counting only reviews reads as "nothing due" on a fresh deck,
  // which is the opposite of the truth.
  const due = PRACTICE_ITEMS.reduce((total, item) => {
    for (const direction of DIRECTIONS) {
      const key = cardKey(item.type, item.id, direction)
      if (!seen.has(key) || dueByKey[key]) total++
    }
    return total
  }, 0)

  const groups = [...new Set(PRACTICE_ITEMS.map((item) => item.group))]
  const reviewHref = `/drill?groups=${encodeURIComponent(groups.join(','))}&dirs=recognise,produce`

  return (
    <>
      <div className="px-5 pt-6 max-w-md w-full mx-auto">
        <PractiseCta href={reviewHref} due={due} label="Practise" />
        <TidyDuplicates duplicates={duplicates} />
      </div>
      <SelectionClient dueByKey={dueByKey} seenKeys={seenKeys} />
    </>
  )
}
