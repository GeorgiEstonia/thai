import { DIRECTIONS, PRACTICE_ITEMS, cardKey } from '@/content/items'
import DescribeRunner from '@/components/DescribeRunner'
import RegroupRunner from '@/components/RegroupRunner'
import SeedRunner from '@/components/SeedRunner'
import TidyDuplicates from '@/app/words/TidyDuplicates'
import { requireAuth } from '@/lib/auth'
import { loadProgress } from '@/lib/practice'
import { readPreferences } from '@/lib/preferences'
import { isDue } from '@/lib/srs'
import { chooseTopics, topicsFor } from '@/lib/topics'
import { countDuplicateWords, listWords } from '@/lib/words'

import PracticeHome from './PracticeHome'

export const dynamic = 'force-dynamic'

/** Character and vowel cards waiting, for when they are mixed into practice. */
function lettersWaiting(progress: Map<string, { dueAt: Date }>, now: Date): number {
  let total = 0
  for (const item of PRACTICE_ITEMS) {
    for (const direction of DIRECTIONS) {
      const state = progress.get(cardKey(item.type, item.id, direction))
      if (!state || isDue(state as never, now)) total++
    }
  }
  return total
}

export default async function PracticePage() {
  await requireAuth()

  const [progress, words, duplicates, preferences] = await Promise.all([
    loadProgress(),
    listWords(),
    countDuplicateWords(),
    readPreferences(),
  ])

  const now = new Date()
  const topics = topicsFor(words, progress, now)
  const today = chooseTopics(topics, now)

  const letterGroups = preferences.characters
    ? [...new Set(PRACTICE_ITEMS.map((item) => item.group))]
    : []
  const letters = preferences.characters ? lettersWaiting(progress, now) : 0

  return (
    <>
      <PracticeHome
        today={today.map((topic) => ({
          id: topic.id,
          label: topic.label,
          waiting: topic.wordsWaiting + topic.phrasesWaiting,
        }))}
        topics={topics.map((topic) => ({
          id: topic.id,
          label: topic.label,
          waiting: topic.wordsWaiting + topic.phrasesWaiting,
          preview: topic.preview,
        }))}
        letterGroups={letterGroups}
        letters={letters}
      />
      <div className="px-5 max-w-md w-full mx-auto">
        <TidyDuplicates duplicates={duplicates} />
        <SeedRunner />
        <RegroupRunner />
        <DescribeRunner />
      </div>
    </>
  )
}
