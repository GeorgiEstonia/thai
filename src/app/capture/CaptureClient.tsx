'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Long edge sent to the model — inside its high-resolution range, and small
 *  enough that one page per request stays comfortably under any body limit. */
const MAX_EDGE = 1800
const MAX_PAGES = 20

/** A page that fails to upload is retried this many times before giving up. */
const UPLOAD_RETRIES = 2

async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not read the image')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

  return canvas.toDataURL('image/jpeg', 0.85)
}

export default function CaptureClient({ packs }: { packs: string[] }) {
  const router = useRouter()
  const [pack, setPack] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

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

      // One page per request — a whole batch in one body exceeds the limit.
      let uploaded = 0
      const failed: number[] = []

      for (const [index, file] of files.entries()) {
        const image = await downscale(file)
        let ok = false

        for (let attempt = 0; attempt <= UPLOAD_RETRIES && !ok; attempt++) {
          try {
            const response = await fetch(`/api/worksheets/${id}/pages`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ image }),
            })
            ok = response.ok
          } catch {
            ok = false
          }
          if (!ok) await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)))
        }

        if (ok) uploaded++
        else failed.push(index + 1)
        setProgress({ done: index + 1, total: files.length })
      }

      // Start with whatever made it. Previously one bad page threw here and
      // the batch was left sitting in "uploading" forever, unreadable and
      // unrecoverable.
      if (uploaded === 0) throw new Error('no pages uploaded')
      await fetch(`/api/worksheets/${id}/start`, { method: 'POST' })

      setProgress(null)
      if (failed.length > 0) {
        setError(
          `Page${failed.length === 1 ? '' : 's'} ${failed.join(', ')} did not upload; reading the other ${uploaded}.`,
        )
      }
      router.refresh()
    } catch {
      setError('Upload failed. Try again, or with fewer pages.')
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
