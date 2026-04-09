'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const links = [
    { href: '/', label: 'Discover', icon: '🔍' },
    ...(user
      ? [
          { href: '/plan', label: 'Calendar', icon: '📅' },
          { href: '/history', label: 'Memories', icon: '📸' },
        ]
      : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden">
      <div className="flex items-center justify-around py-2">
        {links.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                isActive ? 'text-emerald-600' : 'text-gray-500'
              }`}
            >
              <span className="text-lg">{link.icon}</span>
              <span className="font-medium">{link.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
