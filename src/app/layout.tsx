import type { Metadata, Viewport } from 'next'
import { Itim, Noto_Sans_Thai, Noto_Serif_Thai, Sarabun } from 'next/font/google'

import Nav from '@/components/Nav'

import './globals.css'

/**
 * Four Thai faces, deliberately.
 *
 * The loop at the start of most Thai letters — the หัว, "head" — is the single
 * most identifying feature of a glyph, and it is exactly what loopless display
 * faces throw away. So the main face is looped, and the others are there to
 * teach the letter's identity rather than one typeface's rendering of it.
 */

/** MAIN — looped sans. The Thai government standard face; unambiguous heads. */
const sarabun = Sarabun({
  variable: '--font-thai-main',
  subsets: ['thai'],
  weight: ['400', '600'],
})

/** Looped serif — what books and formal print look like. */
const notoSerifThai = Noto_Serif_Thai({
  variable: '--font-thai-serif',
  subsets: ['thai'],
  weight: ['400'],
})

/** Loopless — heads dropped entirely. Ubiquitous on signage and branding, and
 *  the form that is hardest to read until you already know the letters. */
const notoSansThai = Noto_Sans_Thai({
  variable: '--font-thai-loopless',
  subsets: ['thai'],
  weight: ['400'],
})

/** Handwritten — closer to what a teacher writes on a whiteboard. */
const itim = Itim({
  variable: '--font-thai-hand',
  subsets: ['thai'],
  weight: ['400'],
})

export const metadata: Metadata = {
  title: 'Thai',
  description: 'Character and vocabulary practice',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Thai' },
}

export const viewport: Viewport = {
  themeColor: '#0f1113',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${sarabun.variable} ${notoSerifThai.variable} ${notoSansThai.variable} ${itim.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        {children}
      </body>
    </html>
  )
}
