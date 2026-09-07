import Link from 'next/link'

import { requireAuth } from '@/lib/auth'
import { countDuplicateWords, listPacks, listWords } from '@/lib/words'
import { loadProgress } from '@/lib/practice'

import SoundSetting from './SoundSetting'
import SignOut from './SignOut'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  await requireAuth()

  const [words, packs, duplicates, progress] = await Promise.all([
    listWords(),
    listPacks(),
    countDuplicateWords(),
    loadProgress(),
  ])

  const described = words.filter((word) => word.exampleThai).length
  const prioritised = words.filter((word) => (word.priority ?? 0) !== 0).length

  const rows = [
    { label: 'Words', value: words.filter((word) => word.kind === 'word').length },
    { label: 'Phrases', value: words.filter((word) => word.kind === 'phrase').length },
    { label: 'Packs', value: packs.length },
    { label: 'With an example', value: `${described} of ${words.length}` },
    { label: 'Prioritised by you', value: prioritised },
    { label: 'Cards being scheduled', value: progress.size },
    { label: 'Duplicate rows', value: duplicates },
  ]

  return (
    <div className="mt-6">
      <h1 className="text-lg font-medium">Settings</h1>

      <section className="mt-5">
        <h2 className="text-xs uppercase tracking-widest text-muted">Practice</h2>
        <div className="mt-2 rounded-xl border border-edge px-3 py-3">
          <SoundSetting />
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
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Link href="/capture" className="rounded-xl border border-edge py-3 text-center text-sm">
            Photograph
          </Link>
          <Link href="/generate" className="rounded-xl border border-edge py-3 text-center text-sm">
            Generate
          </Link>
          <Link href="/words" className="rounded-xl border border-edge py-3 text-center text-sm">
            By hand
          </Link>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-widest text-muted">Detail</h2>
        <Link
          href="/progress"
          className="mt-2 block rounded-xl border border-edge px-3 py-3 text-sm"
        >
          Every item and when it is next due
        </Link>
      </section>

      <section className="mt-8 border-t border-edge pt-5">
        <SignOut />
      </section>
    </div>
  )
}
