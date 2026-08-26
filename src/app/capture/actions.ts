'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/lib/auth'
import { addWords } from '@/lib/words'
import { markReviewed } from '@/lib/worksheets'

export interface ApprovedWord {
  thai: string
  ipa: string
  english: string
  kind: 'word' | 'phrase'
  notes: string | null
}

/** Files the items that were held back, once you've looked at them. */
export async function approveWords(
  worksheetId: string,
  approved: ApprovedWord[],
  pack: string | null,
): Promise<{ added: number }> {
  await requireAuth()

  const usable = approved.filter((word) => word.thai.trim() && word.english.trim())
  await addWords(
    usable.map((word) => ({
      ...word,
      pack: pack?.trim() || null,
      source: 'worksheet' as const,
      worksheetId,
    })),
  )
  await markReviewed(worksheetId)

  revalidatePath('/words')
  return { added: usable.length }
}
