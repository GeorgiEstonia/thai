'use server'

import { redirect } from 'next/navigation'

import { endSession, requireAuth } from '@/lib/auth'

export async function signOut(): Promise<void> {
  await requireAuth()
  await endSession()
  redirect('/login')
}
