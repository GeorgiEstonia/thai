'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { uploadPage } from './actions'

/** Longest edge sent to the model. Comfortably inside its high-resolution
 *  range while keeping the upload small enough for a phone on cellular. */
const MAX_EDGE = 2000

/** Downscales in the browser so a 12MP phone photo isn't posted whole. */
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

export default function CaptureClient() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const dataUrl = await downscale(file)
      const { id } = await uploadPage(dataUrl)
      router.push(`/capture/${id}`)
    } catch {
      setError('That did not upload. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="mt-5">
      <label
        className={`flex h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-edge text-sm ${
          busy ? 'opacity-50' : ''
        }`}
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy}
          className="sr-only"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <span className="text-3xl" aria-hidden>
          ⌗
        </span>
        <span className="mt-2 text-muted">{busy ? 'Reading the page…' : 'Take or choose a photo'}</span>
      </label>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-class-high">
          {error}
        </p>
      ) : null}
    </div>
  )
}
