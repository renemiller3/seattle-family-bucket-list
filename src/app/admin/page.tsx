import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import ActivityAdminList from '@/components/admin/ActivityAdminList'
import type { Activity } from '@/lib/types'

export const metadata = { title: 'Admin — Activities' }
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user)) redirect('/')

  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .order('title')

  return <ActivityAdminList activities={(activities ?? []) as Activity[]} />
}
