'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

export default function Header() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🌲</span>
          <span className="text-lg font-bold text-gray-900">
            Seattle Family <span className="text-emerald-600">Bucket List</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Discover
          </Link>
          {user && (
            <>
              <Link href="/plan" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                My Calendar
              </Link>
              <Link href="/bucket-list" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                My Bucket List
              </Link>
            </>
          )}
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-200" />
          ) : user ? (
            <div className="flex items-center gap-3">
              {user.user_metadata?.avatar_url && (
                <img src={user.user_metadata.avatar_url} alt="" className="h-8 w-8 rounded-full" />
              )}
              <button
                onClick={signOut}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-2 rounded-lg bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              Sign in with Google
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="relative md:hidden" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            {menuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Discover
              </Link>
              {user && (
                <>
                  <Link
                    href="/plan"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    My Calendar
                  </Link>
                  <Link
                    href="/bucket-list"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    My Bucket List
                  </Link>
                </>
              )}
              <div className="my-1 border-t border-gray-100" />
              {user ? (
                <button
                  onClick={() => { signOut(); setMenuOpen(false) }}
                  className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => { signInWithGoogle(); setMenuOpen(false) }}
                  className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Sign in with Google
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
