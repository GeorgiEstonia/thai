'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Three places: practise, add to the deck, everything else.
 *
 * It used to be Characters, Words and More, which split the two things you
 * practise into separate tabs and made the writing system a subject you had
 * to decide to study — so one you could quietly stop studying. Letters are a
 * setting now, mixed into practice, and the tabs are the three things you
 * actually come here to do.
 */
const TABS = [
  { href: '/practice', label: 'Practise', match: ['/practice', '/drill'] },
  { href: '/add', label: 'Add', match: ['/add', '/capture', '/generate', '/words'] },
  { href: '/settings', label: 'More', match: ['/settings', '/progress'] },
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
              aria-current={active ? 'page' : undefined}
              // Generous padding: a 1.5-unit tall tab is below the ~44px
              // minimum touch target and gets missed on a phone.
              className={`rounded-lg px-4 py-3 text-sm ${
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
