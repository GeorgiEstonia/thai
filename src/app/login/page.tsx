'use client'

import { useActionState } from 'react'

import { login } from './actions'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, {})

  return (
    <main className="flex-1 flex flex-col justify-center px-6 py-16 max-w-sm w-full mx-auto">
      <p className="thai text-6xl text-center mb-10 select-none" aria-hidden>
        ก
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <label htmlFor="passphrase" className="text-sm text-muted">
          Passphrase
        </label>
        <input
          id="passphrase"
          name="passphrase"
          type="password"
          autoComplete="current-password"
          autoFocus
          className="rounded-xl border border-edge bg-surface px-4 py-3 text-lg outline-none focus:border-class-mid"
        />

        {state?.error ? (
          <p role="alert" className="text-sm text-class-high">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-xl bg-foreground px-4 py-3 text-lg font-medium text-background disabled:opacity-50"
        >
          {pending ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </main>
  )
}
