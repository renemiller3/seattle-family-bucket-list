import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import ActivityAdminForm from '@/components/admin/ActivityAdminForm'
import type { Activity } from '@/lib/types'

export const metadata = { title: 'Admin — Edit Activity' }
export const dynamic = 'force-dynamic'

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user)) redirect('/')

  const { data: activity } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .single()

  if (!activity) notFound()

  return <ActivityAdminForm activity={activity as Activity} />
}
