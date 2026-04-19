import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import ActivityAdminForm from '@/components/admin/ActivityAdminForm'

export const metadata = { title: 'Admin — New Activity' }
export const dynamic = 'force-dynamic'

export default async function NewActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user)) redirect('/')

  return <ActivityAdminForm />
}
