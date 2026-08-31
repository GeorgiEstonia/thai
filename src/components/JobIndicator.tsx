'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Job {
  id: string
  status: string
  pagesDone: number
  pages: number
  stalled: boolean
}

/**
 * Shows that pages are still being read, wherever you are in the app.
 *
 * Reading a chapter takes minutes, and you should be able to carry on
 * practising meanwhile — so the progress has to follow you rather than live on
 * the upload screen.
 */
export default function JobIndicator() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [justFinished, setJustFinished] = useState(false)

  useEffect(() => {
    let previous = 0
    let cancelled = false

    async function poll() {
      try {
        const response = await fetch('/api/jobs')
        if (!response.ok) return
        const { jobs: next } = (await response.json()) as { jobs: Job[] }
        if (cancelled) return

        // Went from working to idle: something finished.
        if (previous > 0 && next.length === 0) setJustFinished(true)
        previous = next.length
        setJobs(next)
      } catch {
        // Offline or mid-deploy; the next tick will pick it up.
      }
    }

    poll()
    const timer = setInterval(poll, 5000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (justFinished && jobs.length === 0) {
    return (
      <Link
        href="/words"
        onClick={() => setJustFinished(false)}
        className="block bg-class-mid/15 px-5 py-2 text-center text-xs text-class-mid"
      >
        Pages finished — see the words
      </Link>
    )
  }

  if (jobs.length === 0) return null

  const job = jobs[0]
  const label = job.stalled
    ? 'Reading stalled'
    : job.status === 'verifying'
      ? 'Checking what was found…'
      : `Reading page ${Math.min(job.pagesDone + 1, job.pages)} of ${job.pages}…`

  return (
    <Link
      href={`/capture/${job.id}`}
      className="block bg-surface px-5 py-2 text-center text-xs text-muted"
    >
      {label}
      {job.stalled ? ' — tap to resume' : null}
    </Link>
  )
}
