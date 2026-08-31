import Link from 'next/link'

import {
  DIRECTIONS,
  PRACTICE_ITEMS,
  SELECTABLE_GROUPS,
  cardKey,
} from '@/content/items'
import { requireAuth } from '@/lib/auth'
import { loadProgress } from '@/lib/practice'
import { listWordItems } from '@/lib/words'
import { LEECH_LAPSE_THRESHOLD, type SrsState, isDue } from '@/lib/srs'

export const dynamic = 'force-dynamic'

function describe(state: SrsState | undefined, now: Date): { text: string; tone: string } {
  if (!state || state.reps === 0) return { text: 'new', tone: 'text-muted' }
  if (isDue(state, now)) return { text: 'due', tone: 'text-class-high' }

  const days = Math.max(1, Math.round((state.dueAt.getTime() - now.getTime()) / 86_400_000))
  return { text: `${days}d`, tone: 'text-class-mid' }
}

export default async function ProgressPage() {
  await requireAuth()

  const now = new Date()
  const [progress, wordItems] = await Promise.all([loadProgress(), listWordItems()])

  // Words belong here too — mastery is mastery, whatever kind of item it is.
  const itemsByGroup = new Map<string, typeof PRACTICE_ITEMS>()
  for (const item of [...PRACTICE_ITEMS, ...wordItems]) {
    const list = itemsByGroup.get(item.group) ?? []
    list.push(item)
    itemsByGroup.set(item.group, list)
  }

  return (
    <main className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium">Progress</h1>
        <Link href="/practice" className="text-sm text-muted underline underline-offset-4">
          Practise
        </Link>
      </header>
      <p className="mt-2 text-sm text-muted">
        Everything you practise, in both directions. The number is days until it&rsquo;s next
        due. &ldquo;R&rdquo; is reading it (Thai first); &ldquo;P&rdquo; is producing it (sound
        or meaning first).
      </p>

      <div className="mt-6 space-y-6">
        {[
          ...SELECTABLE_GROUPS,
          // One section per vocabulary pack, in the same shape.
          ...[...new Set(wordItems.map((item) => item.group))].sort().map((id) => ({
            id,
            kind: 'word' as const,
            label: id === 'words' ? 'Ungrouped words' : id.replace(/^pack:/, ''),
            preview: [],
            count: 0,
          })),
        ].map((group) => {
          const items = itemsByGroup.get(group.id) ?? []
          if (items.length === 0) return null

          return (
            <section key={`${group.kind}-${group.id}`}>
              <h2 className="font-mono text-sm text-muted">{group.label}</h2>

              <table className="mt-2 w-full border-collapse text-sm">
                <tbody>
                  {items.map((item) => (
                    <tr key={`${item.type}-${item.id}`} className="border-t border-edge">
                      <td className="py-2 pr-2">
                        <span
                          className={`${item.type === 'vowel' ? 'thai-vowel' : 'thai'} text-2xl`}
                        >
                          {item.thai}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-xs text-muted">
                        {item.type === 'character'
                          ? item.character.namePaiboon
                          : item.type === 'vowel'
                            ? `${item.vowel.length} · /${item.vowel.ipa}/`
                            : item.word.english}
                      </td>
                      {DIRECTIONS.map((direction) => {
                        const state = progress.get(cardKey(item.type, item.id, direction))
                        const { text, tone } = describe(state, now)
                        const leech = (state?.lapses ?? 0) >= LEECH_LAPSE_THRESHOLD

                        return (
                          <td key={direction} className="py-2 pl-2 text-right whitespace-nowrap">
                            <span className="text-[10px] uppercase text-muted">
                              {direction === 'recognise' ? 'R' : 'P'}
                            </span>{' '}
                            <span className={tone}>{text}</span>
                            {leech ? <span className="ml-1 text-class-high">!</span> : null}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )
        })}
      </div>
    </main>
  )
}
