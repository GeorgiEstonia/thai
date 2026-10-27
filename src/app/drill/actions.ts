'use server'

import { revalidatePath } from 'next/cache'

import { type Direction, type ItemType, findItem } from '@/content/items'
import { requireAuth } from '@/lib/auth'
import { loadOneState, recordReview } from '@/lib/mutations'
import { type Grade, applyGrade, newState, toPriority } from '@/lib/srs'
import { deleteWord, listWords, saveNote, setWordPriority, updateWord } from '@/lib/words'

/**
 * Grades one showing.
 *
 * The client owns the session queue, but the schedule is recomputed here from
 * what is actually stored rather than from anything the browser sends — the
 * client only says which card, which direction, and which button.
 */
export async function gradeCard(
  itemType: ItemType,
  itemId: string,
  direction: Direction,
  grade: Grade,
  reinforcement: boolean,
): Promise<void> {
  await requireAuth()

  // Words live in the database, so only the authored content is checked here.
  if (itemType !== 'word' && !findItem(itemType, itemId)) {
    throw new Error(`Unknown item: ${itemType}:${itemId}`)
  }

  const now = new Date()
  const before = (await loadOneState(itemType, itemId, direction)) ?? newState(now)

  // How often you asked to see this one. Read here rather than trusted from
  // the browser, for the same reason the schedule is: the client says which
  // card and which button, never what the answer is worth.
  const priority =
    itemType === 'word'
      ? toPriority((await listWords()).find((word) => word.id === itemId)?.priority)
      : 0

  await recordReview({
    itemType,
    itemId,
    direction,
    grade,
    // A reinforcement showing is logged but must not move the due date.
    scheduling: reinforcement ? null : { before, after: applyGrade(before, grade, now, priority) },
    intervalAtShowing: before.intervalDays,
    reviewedAt: now,
  })
}

/** Saves a mnemonic you wrote yourself. Empty text clears it. */
export async function saveMnemonic(
  itemType: ItemType,
  itemId: string,
  mnemonic: string,
): Promise<void> {
  await requireAuth()
  await saveNote(itemType, itemId, mnemonic)
}

/**
 * Editing and deleting a card from inside the drill.
 *
 * Both already exist on the vocabulary screen; these are the same operations
 * reached from where you actually notice the problem.
 */
export async function editDrillWord(
  id: string,
  patch: { thai: string; ipa: string; english: string; notes: string | null; pack: string | null },
): Promise<void> {
  await requireAuth()
  await updateWord(id, patch)
  revalidatePath('/words')
  revalidatePath('/practice')
}

export async function removeDrillWord(id: string): Promise<void> {
  await requireAuth()
  await deleteWord(id)
  revalidatePath('/words')
  revalidatePath('/practice')
}

/** Sets how often a word comes round: 1 more, -1 less, 0 the normal schedule. */
export async function prioritiseWord(id: string, priority: number): Promise<void> {
  await requireAuth()
  await setWordPriority(id, priority)
  revalidatePath('/words')
  revalidatePath('/practice')
}

/**
 * Other sentences in your deck that use this word.
 *
 * Seeing a word in a second and third place is what turns a gloss into a
 * sense of range — ได้ meaning "can" after a verb and "managed to" before one
 * is not something a one-line meaning can carry.
 *
 * Matched by substring, which is safe here in a way it is not when splitting
 * a sentence: the worst case is listing a sentence that merely contains these
 * letters, and the sentence is shown in full for you to judge. Nothing is
 * being asserted about what it means.
 */
export async function alsoIn(
  thai: string,
): Promise<{ thai: string; english: string }[]> {
  await requireAuth()

  const needle = thai.trim()
  if (needle.length < 2) return []

  const words = await listWords()
  const seen = new Set<string>()
  const out: { thai: string; english: string }[] = []

  for (const word of words) {
    // The word's own card is not somewhere it "also" appears.
    if (word.thai.trim() === needle) continue

    const sentence =
      word.kind === 'phrase' && word.thai.includes(needle)
        ? { thai: word.thai, english: word.english }
        : word.exampleThai?.includes(needle)
          ? { thai: word.exampleThai, english: word.exampleEnglish ?? '' }
          : null

    if (!sentence || seen.has(sentence.thai)) continue
    seen.add(sentence.thai)
    out.push(sentence)
    if (out.length === 4) break
  }

  return out
}
