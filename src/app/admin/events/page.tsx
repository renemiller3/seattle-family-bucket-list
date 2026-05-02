import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'
import EventsAdminQueue from '@/components/admin/EventsAdminQueue'
import type { EventQueueItem } from '@/lib/types'

export const metadata = { title: 'Admin — Events Queue' }
export const dynamic = 'force-dynamic'

export default async function AdminEventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user)) redirect('/')

  const admin = createAdminClient()
  const { data: items } = await admin
    .from('event_queue')
    .select('*')
    .eq('review_status', 'pending')
    .order('raw_start_at')

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
              ← Activities
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-medium text-gray-900">Events Queue</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Events Queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            AI-enriched events waiting for review. High-confidence items can be bulk-approved.
          </p>
        </div>
        <a
          href="/events"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View Published Events ↗
        </a>
      </div>

      <EventsAdminQueue items={(items ?? []) as EventQueueItem[]} />
    </div>
  )
}
