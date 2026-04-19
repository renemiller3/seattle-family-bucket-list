import type { User } from '@supabase/supabase-js'

export function isAdmin(user: User | null | undefined): boolean {
  if (!user?.email) return false
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return false
  return user.email.toLowerCase() === adminEmail.toLowerCase()
}
