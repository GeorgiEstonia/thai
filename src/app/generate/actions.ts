'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/lib/auth'
import { type GeneratedWord, generateWords } from '@/lib/generate'
import { addWords, listWords } from '@/lib/words'

export async function suggestWords(topic: string, count: number) {
  await requireAuth()
  const existing = await listWords()
  return generateWords(topic, existing, count)
}

export async function acceptWords(items: GeneratedWord[], pack: string | null) {
  await requireAuth()

  // Re-check against the deck at save time, in case something was added
  // between generating and accepting.
  const existing = new Set((await listWords()).map((word) => word.thai.trim()))
  const fresh = items.filter((item) => item.thai.trim() && !existing.has(item.thai.trim()))

  await addWords(fresh.map((item) => ({ ...item, pack, source: 'manual' as const })))
  revalidatePath('/words')
  return { added: fresh.length }
}
