import { waitUntil } from '@vercel/functions'
import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { describeKey } from '@/lib/describe-match'
import { DESCRIBE_BATCH, describeWords } from '@/lib/extract'
import { claimLease, refreshLease, releaseLease } from '@/lib/lease'
import { signStep, verifyStep } from '@/lib/steps'
import { describeWord, wordsNeedingDescription } from '@/lib/words'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Scope for the signed token and the lease; the job is a singleton. */
const JOB = 'describe'

/**
 * Writes examples for vocabulary that has none, a batch at a time, then calls
 * itself for the next batch.
 *
 * A batch rather than the whole deck because two hundred items in one request
 * runs past the platform's function timeout and is killed with nothing saved —
 * the same failure that used to eat photo imports. Each call saves what it
 * wrote before returning, so progress survives a killed request. The size
 * itself was measured; see DESCRIBE_BATCH.
 *
 * The chaining is what makes the backlog the app's problem instead of yours.
 * This used to be driven by a loop in the open page, which meant a deck-wide
 * rewrite needed the tab left open for the duration — a job that only runs
 * while someone watches it is a job someone has to watch. Each link now
 * triggers the next from the server and waitUntil keeps it alive past the
 * response, so one page open starts it and closing the tab does not stop it.
 */

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('t')
  // Either you started it, or it is the chain calling itself.
  const chained = verifyStep(JOB, token)
  if (!chained && !(await isAuthenticated())) {
    return NextResponse.json({ error: 'auth' }, { status: 401 })
  }

  // A link of an existing chain already holds the job. A fresh kick has to
  // claim it, so opening the app while a chain is still running doesn't set a
  // second worker on the same backlog and pay for every word twice.
  if (!chained && !(await claimLease(JOB))) {
    const remaining = (await wordsNeedingDescription(1000)).length
    return NextResponse.json({ described: 0, remaining, running: true })
  }

  const pending = await wordsNeedingDescription(DESCRIBE_BATCH)
  if (pending.length === 0) {
    await releaseLease(JOB)
    return NextResponse.json({ described: 0, remaining: 0 })
  }

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
    //
    // Tolerant of a reading being appended to the echoed field. The prompt
    // tells every Thai word to carry its reading, and the model obligingly
    // applied that to the echo as well — returning "หมา /mǎː/" where "หมา"
    // was sent. That silently matched nothing and saved nothing.
    const byThai = new Map(results.map((entry) => [describeKey(entry.thai), entry]))

    for (const word of pending) {
      const found = byThai.get(describeKey(word.thai))
      if (!found) continue
      await describeWord(word.id, {
        exampleThai: found.exampleThai,
        exampleIpa: found.exampleIpa,
        exampleEnglish: found.exampleEnglish,
        classifier: found.classifier,
        context: found.context,
      })
      described++
    }
  } catch (error) {
    // The chain stops here. Whatever earlier batches saved is kept, and the
    // next page open picks the backlog up again from where this stopped.
    await releaseLease(JOB)
    return NextResponse.json(
      { error: error instanceof Error ? error.message.slice(0, 200) : 'failed' },
      { status: 500 },
    )
  }

  const remaining = (await wordsNeedingDescription(1000)).length

  // Chained only on progress. Were this to continue on `remaining > 0` alone,
  // a batch whose every item failed to match would hand the same words to the
  // next link for ever, buying nothing by the thousand.
  if (described > 0 && remaining > 0) {
    await refreshLease(JOB)
    const next = new URL(request.url)
    next.searchParams.set('t', signStep(JOB))
    const chain = fetch(next.toString(), { method: 'POST' }).catch(() => {})
    try {
      waitUntil(chain)
    } catch {
      // Not on Vercel — the request is already in flight.
    }
  } else {
    await releaseLease(JOB)
  }

  return NextResponse.json({ described, remaining })
}

/** How much is left, for a progress display that doesn't start any work. */
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'auth' }, { status: 401 })
  return NextResponse.json({ remaining: (await wordsNeedingDescription(1000)).length })
}
