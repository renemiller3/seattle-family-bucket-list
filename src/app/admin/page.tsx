import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'
import ActivityAdminList from '@/components/admin/ActivityAdminList'
import type { Activity } from '@/lib/types'

export const metadata = { title: 'Admin — Activities' }
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user)) redirect('/')

  const admin = createAdminClient()
  const [activitiesResult, pendingCountResult] = await Promise.all([
    supabase.from('activities').select('*').order('title'),
    admin.from('event_queue').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
  ])

  const pendingCount = pendingCountResult.count ?? 0

  return (
    <div>
      {pendingCount > 0 && (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <Link
            href="/admin/events"
            className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm hover:bg-amber-100 transition-colors"
          >
            <span className="font-medium text-amber-800">
              {pendingCount} event{pendingCount !== 1 ? 's' : ''} waiting for review
            </span>
            <span className="text-amber-600">Review Events Queue →</span>
          </Link>
        </div>
      )}
      <ActivityAdminList activities={(activitiesResult.data ?? []) as Activity[]} />
    </div>
  )
}
