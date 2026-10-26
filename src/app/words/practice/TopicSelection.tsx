'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { DIRECTIONS, WORD_DIRECTION_LABELS, type Direction } from '@/content/items'

interface Topic {
  id: string
  label: string
  wordsWaiting: number
  phrasesWaiting: number
  totalWords: number
  totalPhrases: number
  preview: { thai: string; ipa: string }[]
}

interface BlockingWord {
  thai: string
  ipa: string
  english: string
}

interface LockedPreview {
  thai: string
  ipa: string
  english: string
  blockedBy: BlockingWord[]
}

interface Chosen {
  id: string
  label: string
  reason: 'due' | 'continue' | 'fresh'
}

/** What the app is doing for you, said plainly on the button's second line. */
const REASON: Record<Chosen['reason'], string> = {
  due: 'due for review',
  continue: 'carrying on where you stopped',
  fresh: 'your newest topic',
}

/**
 * One topic a sitting, chosen for you unless you want to choose.
 *
 * The big button is the whole screen's job. Picking from a grid every time is
 * a decision you have to make before you are allowed to study, and it is a
 * decision the app is better placed to make: it knows what is due.
 */
export default function TopicSelection({
  topics,
  chosen,
  lockedCount,
  nextUp,
}: {
  topics: Topic[]
  chosen: Chosen | null
  lockedCount: number
  nextUp: LockedPreview[]
}) {
  const router = useRouter()
  const [directions, setDirections] = useState<Direction[]>([...DIRECTIONS])
  const [open, setOpen] = useState(false)

  function start(topicId: string) {
    // No kind: a topic session is its words and then its sentences, which the
    // deck orders for us. Splitting them was the old screen's idea.
    router.push(
      `/drill?${new URLSearchParams({ groups: topicId, dirs: directions.join(',') })}`,
    )
  }

  const chosenTopic = topics.find((topic) => topic.id === chosen?.id)
  const waiting = chosenTopic
    ? chosenTopic.wordsWaiting + chosenTopic.phrasesWaiting
    : 0

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <h1 className="text-lg font-medium">Practise</h1>

      {chosen && chosenTopic ? (
        <section className="mt-5">
          <button
            onClick={() => start(chosen.id)}
            disabled={directions.length === 0}
            className="w-full rounded-2xl bg-foreground px-5 py-5 text-left text-background disabled:opacity-40"
          >
            <span className="block text-base font-medium">Practise {chosen.label}</span>
            <span className="block text-xs opacity-70">
              {waiting} waiting · {REASON[chosen.reason]}
            </span>
          </button>

          <p className="thai mt-2 truncate text-center text-lg text-muted">
            {chosenTopic.preview.map((word) => word.thai).join('  ')}
          </p>
          {chosenTopic.totalPhrases > 0 ? (
            <p className="mt-1 text-center text-xs text-muted">
              Words first, then {chosenTopic.phrasesWaiting > 0 ? 'its sentences' : 'its sentences once the words are in'}.
            </p>
          ) : null}
        </section>
      ) : (
        <p className="mt-5 rounded-xl bg-surface px-3 py-3 text-sm text-muted">
          Nothing is due. Everything you have started is scheduled for later — pick a topic below
          if you want to push on anyway.
        </p>
      )}

      <section className="mt-6">
        <button
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="w-full rounded-xl border border-edge px-3 py-3 text-sm text-muted"
        >
          {open ? 'Hide topics' : 'Choose a topic instead'}
        </button>

        {open ? (
          <>
            <h2 className="mt-5 text-xs uppercase tracking-widest text-muted">Direction</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DIRECTIONS.map((direction) => {
                const on = directions.includes(direction)
                return (
                  <button
                    key={direction}
                    onClick={() =>
                      setDirections((prev) =>
                        prev.includes(direction)
                          ? prev.filter((d) => d !== direction)
                          : [...prev, direction],
                      )
                    }
                    aria-pressed={on}
                    className={`rounded-xl border px-3 py-3 text-sm ${
                      on ? 'border-class-mid bg-surface' : 'border-edge text-muted'
                    }`}
                  >
                    {WORD_DIRECTION_LABELS[direction]}
                  </button>
                )
              })}
            </div>

            <h2 className="mt-6 text-xs uppercase tracking-widest text-muted">Topics</h2>
            {topics.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Nothing waiting anywhere — everything you have started is scheduled for later.
              </p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => start(topic.id)}
                    disabled={directions.length === 0}
                    className="rounded-xl border border-edge p-3 text-left disabled:opacity-40"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm">{topic.label}</span>
                      <span className="text-[11px] text-class-high">
                        {topic.wordsWaiting + topic.phrasesWaiting}
                      </span>
                    </div>
                    <p className="thai mt-1 truncate text-lg">
                      {topic.preview.map((word) => word.thai).join(' ')}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-muted">
                      {topic.preview.map((word) => word.ipa).filter(Boolean).join(' · ')}
                    </p>
                    {topic.totalPhrases > 0 ? (
                      <p className="mt-1 text-[10px] text-muted">
                        {topic.totalWords} words · {topic.phrasesWaiting > 0 ? `${topic.phrasesWaiting} sentence cards` : `${topic.totalPhrases} sentences waiting on words`}
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : null}
      </section>

      {lockedCount > 0 ? (
        <section className="mt-8 rounded-xl bg-surface px-3 py-3">
          <p className="text-xs leading-relaxed text-muted">
            A sentence opens once you are at most one word short of it, so a sentence is never
            where you meet five new words at once. {lockedCount}{' '}
            {lockedCount === 1 ? 'is' : 'are'} still waiting.
          </p>
          <ul className="mt-2 space-y-2">
            {nextUp.map((row) => (
              <li key={row.thai} className="text-xs">
                <span className="thai text-base">{row.thai}</span>
                {row.ipa ? (
                  <span className="ml-2 font-mono text-[11px] text-muted">/{row.ipa}/</span>
                ) : null}
                <span className="block text-muted">{row.english}</span>
                <span className="mt-1 block text-muted">needs:</span>
                <ul className="ml-3">
                  {row.blockedBy.map((word) => (
                    <li key={word.thai}>
                      <span className="thai text-base">{word.thai}</span>
                      {word.ipa ? (
                        <span className="ml-2 font-mono text-[11px] text-muted">/{word.ipa}/</span>
                      ) : null}
                      {word.english ? (
                        <span className="ml-2 text-muted">{word.english}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}
