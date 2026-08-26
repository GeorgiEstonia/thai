import { requireAuth } from '@/lib/auth'
import { listPacks, listWords } from '@/lib/words'

import GenerateClient from './GenerateClient'

export const dynamic = 'force-dynamic'

export default async function GeneratePage() {
  await requireAuth()
  const [packs, words] = await Promise.all([listPacks(), listWords()])
  return <GenerateClient packs={packs} deckSize={words.length} />
}
