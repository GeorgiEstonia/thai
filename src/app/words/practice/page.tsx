import Link from 'next/link'

import { requireAuth } from '@/lib/auth'
import { loadProgress } from '@/lib/practice'
import { chooseTopic, topicsFor } from '@/lib/topics'
import { partitionPhrases } from '@/lib/unlock'
import { listWords } from '@/lib/words'

import TopicSelection from './TopicSelection'

export const dynamic = 'force-dynamic'

/**
 * Practice is organised by topic, not by the whole deck at once.
 *
 * Six hundred items sorted only by what is due means a sitting that goes from
 * "turn left" to an aunt to a plate, and each card arrives with nothing around
 * it. The deck is already sorted into topics on import; this makes that the
 * unit of practice, so a sitting covers left, right and turn-left together and
 * then the sentences built out of them.
 */
export default async function WordPracticePage() {
  await requireAuth()

  const [progress, words] = await Promise.all([loadProgress(), listWords()])
  const now = new Date()

  const topics = topicsFor(words, progress, now)
  const choice = chooseTopic(topics)
  const { locked } = partitionPhrases(words, progress)

  if (words.length === 0) {
    return (
      <main className="flex-1 px-5 py-8 max-w-md w-full mx-auto text-center">
        <p className="text-sm text-muted">No words yet.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Link href="/words" className="rounded-xl border border-edge px-4 py-2 text-sm">
            Add
          </Link>
          <Link href="/generate" className="rounded-xl border border-edge px-4 py-2 text-sm">
            Generate
          </Link>
          <Link href="/capture" className="rounded-xl border border-edge px-4 py-2 text-sm">
            Photograph
          </Link>
        </div>
      </main>
    )
  }

  return (
    <TopicSelection
      topics={topics.map((topic) => ({
        id: topic.id,
        label: topic.label,
        wordsWaiting: topic.wordsWaiting,
        phrasesWaiting: topic.phrasesWaiting,
        totalWords: topic.totalWords,
        totalPhrases: topic.totalPhrases,
        preview: topic.preview,
      }))}
      chosen={choice ? { id: choice.topic.id, label: choice.topic.label, reason: choice.reason } : null}
      lockedCount={locked.length}
      // The handful closest to opening, so the screen can say what practising
      // words is actually buying you rather than just that something is shut.
      nextUp={[...locked]
        .sort((a, b) => a.blockedBy.length - b.blockedBy.length)
        .slice(0, 3)
        .map(({ phrase, blockedBy }) => ({
          thai: phrase.thai,
          ipa: phrase.ipa,
          english: phrase.english,
          blockedBy: blockedBy.slice(0, 4).map((thai) => {
            const match = words.find((word) => word.thai === thai)
            return { thai, ipa: match?.ipa ?? '', english: match?.english ?? '' }
          }),
        }))}
    />
  )
}
