'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/lib/auth'
import { addWords } from '@/lib/words'
import { createWorksheet, markReviewed, runExtraction } from '@/lib/worksheets'

export async function uploadPage(imageDataUrl: string): Promise<{ id: string }> {
  await requireAuth()

  const id = await createWorksheet(imageDataUrl)
  // Extraction takes a while on a dense page; the review screen polls for it.
  void runExtraction(id, imageDataUrl)
  return { id }
}

export interface ApprovedWord {
  thai: string
  ipa: string
  english: string
  notes: string | null
}

/** Nothing reaches the deck except what you approved on the review screen. */
export async function approveWords(
  worksheetId: string,
  approved: ApprovedWord[],
): Promise<{ added: number }> {
  await requireAuth()

  const usable = approved.filter((word) => word.thai.trim() && word.english.trim())
  await addWords(
    usable.map((word) => ({ ...word, source: 'worksheet' as const, worksheetId })),
  )
  await markReviewed(worksheetId)

  revalidatePath('/words')
  revalidatePath('/practice')
  return { added: usable.length }
}
