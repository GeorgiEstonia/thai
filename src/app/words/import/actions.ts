'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/lib/auth'
import { classifyTopic } from '@/lib/extract'
import { parsePaste } from '@/lib/paste'
import { addWords } from '@/lib/words'

export interface ImportResult {
  added?: number
  skippedLines?: { line: number; text: string }[]
  duplicates?: number
  pack?: string | null
  error?: string
}

/**
 * Takes vocabulary straight from pasted text.
 *
 * The photo path has to upload, read every page with a vision model and check
 * the result; when the words have already been read somewhere else, all of
 * that is work being done twice. This is the same destination by a shorter
 * road — and the examples, classifiers and notes are written afterwards by the
 * same backfill that handles everything else, so a pasted card ends up
 * identical to a photographed one.
 */
export async function importPaste(
  _prev: ImportResult | undefined,
  formData: FormData,
): Promise<ImportResult> {
  await requireAuth()

  const text = String(formData.get('text') ?? '')
  const typedPack = String(formData.get('pack') ?? '').trim()

  const { words, skipped } = parsePaste(text)
  if (words.length === 0) {
    return {
      error: skipped.length
        ? 'Could not read any of that. Each line needs Thai, the sound, and the English, separated by | or a tab.'
        : 'Nothing to import.',
      skippedLines: skipped.slice(0, 5),
    }
  }

  // Same rule as a photo import: what you typed wins, otherwise it names
  // itself rather than joining the ungrouped pile.
  let pack: string | null = typedPack || null
  if (!pack) {
    try {
      pack = await classifyTopic(words)
    } catch {
      // Ungrouped is recoverable; a failed import is not.
    }
  }

  const added = await addWords(words.map((word) => ({ ...word, pack })))

  revalidatePath('/words')
  revalidatePath('/practice')
  revalidatePath('/practice')

  return {
    added: added.length,
    duplicates: words.length - added.length,
    skippedLines: skipped.slice(0, 5),
    pack,
  }
}
