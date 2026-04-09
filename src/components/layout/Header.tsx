'use client'

import Link from 'next/link'
import AuthButton from './AuthButton'
import { useAuth } from '@/hooks/useAuth'

export default function Header() {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🌲</span>
            <span className="text-lg font-bold text-gray-900">
              Seattle Family <span className="text-emerald-600">Bucket List</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Discover
            </Link>
            {user && (
              <>
                <Link href="/plan" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  My Calendar
                </Link>
                <Link href="/history" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Memories
                </Link>
              </>
            )}
          </nav>
        </div>
        <AuthButton />
      </div>
    </header>
  )
}
