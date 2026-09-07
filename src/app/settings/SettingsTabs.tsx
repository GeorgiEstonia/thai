'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/settings', label: 'Settings' },
  { href: '/settings/stats', label: 'Progress' },
  { href: '/settings/usage', label: 'AI usage' },
] as const

export default function SettingsTabs() {
  const pathname = usePathname() ?? ''

  return (
    <div className="flex gap-1 border-b border-edge pb-3">
      {TABS.map((tab) => {
        // Exact match: /settings would otherwise light up on every sub-tab.
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-sm ${
              active ? 'bg-surface font-medium' : 'text-muted'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
