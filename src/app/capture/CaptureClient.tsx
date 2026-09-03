'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Long edge sent to the model — inside its high-resolution range, and small
 *  enough that one page per request stays comfortably under any body limit. */
const MAX_EDGE = 1800
const MAX_PAGES = 20

/** A page that fails to upload is retried this many times before giving up. */
const UPLOAD_RETRIES = 3

/** Pages uploaded at once. Small enough that each body stays well under any
 *  request limit, large enough that twenty pages don't crawl. */
const UPLOAD_CONCURRENCY = 2

async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not read the image')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const url = canvas.toDataURL('image/jpeg', 0.85)
    // Drop the backing store straight away. A phone photo decodes to tens of
    // megabytes, and Safari caps how much canvas and bitmap memory a page may
    // hold — reach it and later images fail to decode, which looks exactly
    // like the upload skipping pages.
    canvas.width = 0
    canvas.height = 0
    return url
  } finally {
    bitmap.close()
  }
}

export default function CaptureClient({ packs }: { packs: string[] }) {
  const router = useRouter()
  const [pack, setPack] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function uploadOne(worksheetId: string, file: File): Promise<boolean> {
    for (let attempt = 0; attempt <= UPLOAD_RETRIES; attempt++) {
      try {
        const image = await downscale(file)
        const response = await fetch(`/api/worksheets/${worksheetId}/pages`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ image }),
        })
        if (response.ok) return true
      } catch {
        // Network hiccup; fall through to the backoff and try again.
      }
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)))
    }
    return false
  }

  async function handleFiles(fileList: FileList | null) {
    const files = [...(fileList ?? [])].slice(0, MAX_PAGES)
    if (files.length === 0) return

    setError(null)
    setProgress({ done: 0, total: files.length })

    try {
      const created = await fetch('/api/worksheets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pack: pack.trim() || null }),
      })
      if (!created.ok) throw new Error('could not start')
      const { id } = (await created.json()) as { id: string }

      // A few at a time: one page per request keeps each body small, but
      // uploading twenty strictly one after another is needlessly slow.
      let done = 0
      const failed: number[] = []

      for (let start = 0; start < files.length; start += UPLOAD_CONCURRENCY) {
        const slice = files.slice(start, start + UPLOAD_CONCURRENCY)
        const results = await Promise.all(slice.map((file) => uploadOne(id, file)))

        results.forEach((ok, offset) => {
          if (ok) done += 1
          else failed.push(start + offset + 1)
        })
        setProgress({ done, total: files.length })
      }

      const uploaded = files.length - failed.length
      if (uploaded === 0) throw new Error('no pages uploaded')

      // Until this lands the batch is not sealed and nothing will read it, so
      // it is worth more than one attempt.
      let started = false
      for (let attempt = 0; attempt < 3 && !started; attempt++) {
        try {
          started = (await fetch(`/api/worksheets/${id}/start`, { method: 'POST' })).ok
        } catch {
          // Fall through and try again.
        }
        if (!started) await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)))
      }

      setProgress(null)
      if (failed.length > 0) {
        setError(
          `Page${failed.length === 1 ? '' : 's'} ${failed.join(', ')} did not upload. Reading the other ${uploaded} — add the rest as a second batch.`,
        )
      }
      router.refresh()
    } catch {
      setError('Upload failed. Check your connection and try again.')
      setProgress(null)
    }
  }

  const busy = progress !== null

  return (
    <div className="mt-5">
      <label className="text-xs uppercase tracking-widest text-muted" htmlFor="pack">
        Pack (optional)
      </label>
      <input
        id="pack"
        list="packs"
        value={pack}
        onChange={(event) => setPack(event.target.value)}
        placeholder="e.g. Chapter 3"
        className="mt-1 w-full rounded-xl border border-edge bg-surface px-3 py-3 text-sm outline-none focus:border-class-mid"
      />
      <datalist id="packs">
        {packs.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <label
        className={`mt-3 flex h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-edge text-sm ${
          busy ? 'opacity-50' : ''
        }`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          className="sr-only"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <span className="text-3xl" aria-hidden>
          ⌗
        </span>
        <span className="mt-2 text-muted">
          {busy ? `Uploading ${progress.done}/${progress.total}…` : 'Choose or photograph pages'}
        </span>
        <span className="mt-1 text-xs text-muted">
          up to {MAX_PAGES} pages · about 20s each
        </span>
      </label>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-class-high">
          {error}
        </p>
      ) : null}
    </div>
  )
}
