import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { DESCRIBE_BATCH, describeWords } from '@/lib/extract'
import { describeWord, wordsNeedingDescription } from '@/lib/words'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Writes examples for vocabulary that has none, a batch at a time.
 *
 * A batch rather than the whole deck because two hundred items in one request
 * runs past the platform's function timeout and is killed with nothing saved —
 * the same failure that used to eat photo imports. Each call saves what it
 * wrote before returning, so progress survives a killed request and the caller
 * just asks again. The size itself was measured; see DESCRIBE_BATCH.
 */

export async function POST() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'auth' }, { status: 401 })

  const pending = await wordsNeedingDescription(DESCRIBE_BATCH)
  if (pending.length === 0) return NextResponse.json({ described: 0, remaining: 0 })

  let described = 0
  try {
    const results = await describeWords(
      pending.map((word) => ({
        thai: word.thai,
        ipa: word.ipa,
        english: word.english,
        kind: word.kind,
        notes: word.notes,
      })),
    )

    // Matched on the written form: it is what was sent and what comes back.
    const byThai = new Map(results.map((entry) => [entry.thai.trim(), entry]))

    for (const word of pending) {
      const found = byThai.get(word.thai.trim())
      if (!found) continue
      await describeWord(word.id, {
        exampleThai: found.exampleThai,
        exampleIpa: found.exampleIpa,
        exampleEnglish: found.exampleEnglish,
        context: found.context,
      })
      described++
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message.slice(0, 200) : 'failed' },
      { status: 500 },
    )
  }

  const remaining = (await wordsNeedingDescription(1000)).length
  return NextResponse.json({ described, remaining })
}

/** How much is left, for a progress display that doesn't start any work. */
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'auth' }, { status: 401 })
  return NextResponse.json({ remaining: (await wordsNeedingDescription(1000)).length })
}
