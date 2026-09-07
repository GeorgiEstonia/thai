'use client'

import { useTransition } from 'react'

import { signOut } from './actions'

export default function SignOut() {
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => signOut())}
      disabled={pending}
      className="text-sm text-muted underline underline-offset-4 disabled:opacity-50"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
