'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Two areas, deliberately separate: the writing system, and vocabulary. They
 * are different kinds of study and mixing their controls on one screen made
 * both harder to scan.
 */
const TABS = [
  { href: '/practice', label: 'Characters', match: ['/practice', '/drill', '/progress'] },
  { href: '/words', label: 'Words', match: ['/words', '/capture', '/generate'] },
] as const

export default function Nav() {
  const pathname = usePathname() ?? ''
  if (pathname === '/login' || pathname === '/') return null

  return (
    <nav className="sticky top-0 z-10 border-b border-edge bg-background">
      <div className="mx-auto flex max-w-md gap-1 px-5 py-2">
        {TABS.map((tab) => {
          const active = tab.match.some((path) => pathname.startsWith(path))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                active ? 'bg-surface font-medium' : 'text-muted'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
