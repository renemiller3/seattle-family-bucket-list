'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // During Next.js static prerender (/_not-found), the Turbopack prerender
  // worker may not have NEXT_PUBLIC_ vars inlined. Use placeholders server-side
  // so the build doesn't throw — the client is never actually called during SSR.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (typeof window === 'undefined' && (!url || !key)) {
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder')
  }
  return createBrowserClient(url!, key!)
}
