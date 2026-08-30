import { requireAuth } from '@/lib/auth'
import { listPacks, listWords } from '@/lib/words'

import GenerateClient from './GenerateClient'

export const dynamic = 'force-dynamic'

/**
 * Generation with Opus can take a minute on a large deck. Vercel caps this by
 * plan — 60s on Hobby, 300s on Pro.
 */
export const maxDuration = 300

export default async function GeneratePage() {
  await requireAuth()
  const [packs, words] = await Promise.all([listPacks(), listWords()])
  return <GenerateClient packs={packs} deckSize={words.length} />
}
