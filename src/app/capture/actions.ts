'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/lib/auth'
import { addWords } from '@/lib/words'
import { createWorksheet, markReviewed, runExtraction } from '@/lib/worksheets'

export async function uploadPages(
  images: string[],
  pack: string | null,
): Promise<{ id: string }> {
  await requireAuth()

  const id = await createWorksheet(images, pack)
  // A batch of dense pages takes a while; the review screen polls for it.
  void runExtraction(id, images)
  return { id }
}

export interface ApprovedWord {
  thai: string
  ipa: string
  english: string
  kind: 'word' | 'phrase'
  notes: string | null
}

/** Nothing reaches the deck except what you approved on the review screen. */
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
  revalidatePath('/practice')
  return { added: usable.length }
}
