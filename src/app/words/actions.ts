'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/lib/auth'
import { addWords, deleteWord, updateWord } from '@/lib/words'

export async function createWord(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; added?: string }> {
  await requireAuth()

  const thai = String(formData.get('thai') ?? '').trim()
  const ipa = String(formData.get('ipa') ?? '').trim()
  const english = String(formData.get('english') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()
  const pack = String(formData.get('pack') ?? '').trim()
  const kind = formData.get('kind') === 'phrase' ? 'phrase' : 'word'

  if (!thai || !english) return { error: 'Thai and English are both needed.' }

  await addWords([{ thai, ipa, english, kind, pack, notes, source: 'manual' }])
  revalidatePath('/words')
  revalidatePath('/practice')
  return { added: thai }
}

export async function removeWord(id: string): Promise<void> {
  await requireAuth()
  await deleteWord(id)
  revalidatePath('/words')
}

export async function editWord(
  id: string,
  patch: { thai: string; ipa: string; english: string; notes: string | null; pack: string | null },
): Promise<void> {
  await requireAuth()
  await updateWord(id, patch)
  revalidatePath('/words')
  revalidatePath('/words/practice')
}
