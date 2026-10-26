'use client'

import Link from 'next/link'

interface TopicRow {
  id: string
  label: string
  waiting: number
  preview: { thai: string; ipa: string }[]
}

interface TodayRow {
  id: string
  label: string
  waiting: number
}

/** Every card in one session comes from these groups. */
function drillHref(groups: string[]): string {
  return `/drill?${new URLSearchParams({ groups: groups.join(','), dirs: 'recognise,produce' })}`
}

/**
 * The screen the app opens on: one button, then the topics.
 *
 * Everything else that used to be here — a words-or-sentences switch, a
 * direction picker, a grid you had to select from before a Start button would
 * light up — was a decision standing between you and practising. The app knows
 * what is due; it can choose. Tapping a topic goes straight in.
 */
export default function PracticeHome({
  today,
  topics,
  letterGroups,
  letters,
}: {
  today: TodayRow[]
  topics: TopicRow[]
  letterGroups: string[]
  letters: number
}) {
  const waiting = today.reduce((sum, topic) => sum + topic.waiting, 0) + letters
  const groups = [...today.map((topic) => topic.id), ...letterGroups]

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      {groups.length > 0 ? (
        <>
          <Link
            href={drillHref(groups)}
            className="block rounded-2xl bg-foreground px-5 py-6 text-center text-background"
          >
            <span className="block text-lg font-medium">Practise</span>
            <span className="block text-xs opacity-70">{waiting} cards waiting</span>
          </Link>

          <p className="mt-3 text-center text-sm text-muted">
            Today: {today.map((topic) => topic.label).join(' · ')}
            {letters > 0 ? ' · letters' : ''}
          </p>
        </>
      ) : (
        <div className="rounded-2xl border border-edge px-5 py-6 text-center">
          <p className="text-sm">Nothing due.</p>
          <p className="mt-1 text-xs text-muted">Pick a topic below to push on anyway.</p>
        </div>
      )}

      {topics.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-widest text-muted">Topics</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={drillHref([topic.id])}
                className="rounded-xl border border-edge p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm">{topic.label}</span>
                  <span className="shrink-0 text-[11px] text-class-high">{topic.waiting}</span>
                </div>
                <p className="thai mt-1 truncate text-lg">
                  {topic.preview.map((word) => word.thai).join(' ')}
                </p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-muted">
                  {topic.preview.map((word) => word.ipa).filter(Boolean).join(' · ')}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
