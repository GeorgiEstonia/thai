'use server'

import { redirect } from 'next/navigation'

import { checkPassphrase, startSession } from '@/lib/auth'

export async function login(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const passphrase = String(formData.get('passphrase') ?? '')

  if (!checkPassphrase(passphrase)) {
    return { error: 'Not that one.' }
  }

  await startSession()
  redirect('/practice')
}
