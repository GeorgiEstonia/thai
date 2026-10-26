import Link from 'next/link'

import { requireAuth } from '@/lib/auth'
import { readPreferences } from '@/lib/preferences'
import { loadStats } from '@/lib/stats'
import { learnedWords, partitionPhrases } from '@/lib/unlock'
import { deckSummary, listWords } from '@/lib/words'
import { loadProgress } from '@/lib/practice'

import CharacterSetting from './CharacterSetting'
import SoundSetting from './SoundSetting'
import SignOut from './SignOut'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  await requireAuth()

  const [deck, progress, stats, words, preferences] = await Promise.all([
    deckSummary(),
    loadProgress(),
    loadStats(),
    listWords(),
    readPreferences(),
  ])

  // "Words you know" means recalled right at least once — the same bar the
  // phrase gate uses, so the two numbers on this screen agree with each other.
  const known = learnedWords(words, progress).size
  const phrasesOpen = partitionPhrases(words, progress).ready.length

  const rows = [
    { label: 'Words', value: deck.words },
    { label: 'Phrases', value: deck.phrases },
    { label: 'Packs', value: deck.packs },
    { label: 'With an example', value: `${deck.described} of ${deck.total}` },
    { label: 'Prioritised by you', value: deck.prioritised },
    { label: 'Cards being scheduled', value: progress.size },
    { label: 'Duplicate rows', value: deck.duplicates },
  ]

  // Leading with how it is going, rather than with a switch for the sound.
  //
  // The full statistics page already existed and nothing linked to it, so the
  // one screen that answers "am I getting anywhere" could not be reached. That
  // is the screen worth opening this tab with: a tab called More that opens on
  // settings is a filing cabinet, and nobody opens a filing cabinet to feel
  // like carrying on.
  const headline = [
    { label: 'day streak', value: stats.currentStreak },
    { label: 'words you know', value: known },
    { label: 'due now', value: stats.deck.due },
  ]

  return (
    <div className="mt-6">
      <h1 className="text-lg font-medium">Your Thai</h1>

      <section className="mt-5">
        <div className="grid grid-cols-3 gap-2 text-center">
          {headline.map((tile) => (
            <div key={tile.label} className="rounded-xl border border-edge py-3">
              <p className="text-xl font-medium tabular-nums">{tile.value}</p>
              <p className="mt-1 text-[11px] leading-tight text-muted">{tile.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link
            href="/settings/stats"
            className="rounded-xl border border-edge px-3 py-3 text-center text-sm"
          >
            Progress in detail
          </Link>
          <Link
            href="/progress"
            className="rounded-xl border border-edge px-3 py-3 text-center text-sm"
          >
            Every card and when
          </Link>
        </div>

        {stats.accuracy.last7 !== null ? (
          <p className="mt-2 text-xs text-muted">
            {stats.accuracy.last7}% right over the last seven days, across{' '}
            {stats.totals.reviews} answers all time.
            {phrasesOpen > 0 ? ` ${phrasesOpen} sentences are open to you now.` : ''}
          </p>
        ) : null}
      </section>

      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-widest text-muted">Practice</h2>
        <div className="mt-2 space-y-2">
          <div className="rounded-xl border border-edge px-3 py-3">
            <SoundSetting />
          </div>
          <div className="rounded-xl border border-edge px-3 py-3">
            <CharacterSetting initial={preferences.characters} />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-widest text-muted">Your deck</h2>
        <dl className="mt-2 divide-y divide-edge">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between py-2">
              <dt className="text-sm text-muted">{row.label}</dt>
              <dd className="text-sm">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-widest text-muted">Add material</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link href="/capture" className="rounded-xl border border-edge py-3 text-center text-sm">
            Photograph
          </Link>
          <Link
            href="/words/import"
            className="rounded-xl border border-edge py-3 text-center text-sm"
          >
            Paste
          </Link>
          <Link href="/generate" className="rounded-xl border border-edge py-3 text-center text-sm">
            Generate
          </Link>
          <Link href="/words" className="rounded-xl border border-edge py-3 text-center text-sm">
            By hand
          </Link>
        </div>
      </section>

      <section className="mt-8 border-t border-edge pt-5">
        <SignOut />
      </section>
    </div>
  )
}
