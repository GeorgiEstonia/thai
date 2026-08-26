import Link from 'next/link'

import { DIRECTIONS, cardKey, packGroupId } from '@/content/items'
import { requireAuth } from '@/lib/auth'
import { loadDueSnapshot } from '@/lib/practice'
import { listWords } from '@/lib/words'

import WordSelection from './WordSelection'

export const dynamic = 'force-dynamic'

export default async function WordPracticePage() {
  await requireAuth()

  const [{ dueByKey, seenKeys }, words] = await Promise.all([loadDueSnapshot(), listWords()])
  const seen = new Set(seenKeys)

  const packs = new Map<string, { id: string; label: string; preview: string[]; waiting: number }>()
  for (const word of words) {
    const id = packGroupId(word.pack)
    const entry = packs.get(id) ?? {
      id,
      label: word.pack ?? 'Ungrouped',
      preview: [],
      waiting: 0,
    }
    if (entry.preview.length < 5) entry.preview.push(word.thai)
    for (const direction of DIRECTIONS) {
      const key = cardKey('word', word.id, direction)
      if (!seen.has(key) || dueByKey[key]) entry.waiting++
    }
    packs.set(id, entry)
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

  return <WordSelection packs={list} />
}
