import Link from 'next/link'

import { DIRECTIONS, cardKey, packGroupId } from '@/content/items'
import { requireAuth } from '@/lib/auth'
import { loadProgress } from '@/lib/practice'
import { partitionPhrases } from '@/lib/unlock'
import { listWords } from '@/lib/words'
import { isDue } from '@/lib/srs'

import WordSelection from './WordSelection'

export const dynamic = 'force-dynamic'

export default async function WordPracticePage() {
  await requireAuth()

  const [progress, words] = await Promise.all([loadProgress(), listWords()])
  const now = new Date()

  // Phrases whose words you haven't met yet are not offered at all — showing
  // them would make the sentence the place you meet those words.
  const { ready, locked } = partitionPhrases(words, progress)
  const readyPhraseIds = new Set(ready.map((phrase) => phrase.id))

  const packs = new Map<
    string,
    { id: string; kind: 'word' | 'phrase'; label: string; preview: string[]; waiting: number }
  >()

  for (const word of words) {
    if (word.kind === 'phrase' && !readyPhraseIds.has(word.id)) continue

    const group = packGroupId(word.pack)
    const key = `${word.kind}|${group}`
    const entry = packs.get(key) ?? {
      id: group,
      kind: word.kind,
      label: word.pack ?? 'Ungrouped',
      preview: [],
      waiting: 0,
    }

    if (entry.preview.length < 5) entry.preview.push(word.thai)
    for (const direction of DIRECTIONS) {
      const state = progress.get(cardKey('word', word.id, direction))
      if (!state || isDue(state, now)) entry.waiting++
    }
    packs.set(key, entry)
  }

  const list = [...packs.values()].sort((a, b) => a.label.localeCompare(b.label))

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
    <WordSelection
      packs={list}
      lockedCount={locked.length}
      // The handful closest to unlocking, so the screen can say what practising
      // words is actually buying you rather than just that something is locked.
      nextUp={[...locked]
        .sort((a, b) => a.blockedBy.length - b.blockedBy.length)
        .slice(0, 3)
        .map(({ phrase, blockedBy }) => ({
          thai: phrase.thai,
          english: phrase.english,
          blockedBy: blockedBy.slice(0, 4),
        }))}
    />
  )
}
