'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { uploadPages } from './actions'

/** Longest edge sent to the model — inside its high-resolution range, small
 *  enough that a batch of pages still uploads from a phone. */
const MAX_EDGE = 2000

/** Whole textbook chapters at once; beyond this the request gets unwieldy. */
const MAX_PAGES = 12

async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not read the image')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

  return canvas.toDataURL('image/jpeg', 0.9)
}

export default function CaptureClient({ packs }: { packs: string[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [count, setCount] = useState(0)
  const [pack, setPack] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(fileList: FileList | null) {
    const files = [...(fileList ?? [])].slice(0, MAX_PAGES)
    if (files.length === 0) return

    setBusy(true)
    setCount(files.length)
    setError(null)
    try {
      // All pages go in one request so repeats across pages collapse.
      const images = await Promise.all(files.map(downscale))
      const { id } = await uploadPages(images, pack.trim() || null)
      router.push(`/capture/${id}`)
    } catch {
      setError('That did not upload. Try fewer pages at once.')
      setBusy(false)
    }
  }

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
        className={`mt-3 flex h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-edge text-sm ${
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
          {busy ? `Reading ${count} page${count === 1 ? '' : 's'}…` : 'Choose or photograph pages'}
        </span>
        <span className="mt-1 text-xs text-muted">up to {MAX_PAGES} at once</span>
      </label>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-class-high">
          {error}
        </p>
      ) : null}
    </div>
  )
}
