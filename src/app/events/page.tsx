import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import EventsGrid from '@/components/events/EventsGrid'
import type { Activity } from '@/lib/types'

export const metadata = { title: 'Upcoming Family Events — Seattle Family Bucket List' }
export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: events } = await supabase
    .from('activities')
    .select('*')
    .eq('type', 'event')
    .gte('start_date', today)
    .order('start_date')

  return (
    <div className="mx-auto px-4 py-8 sm:px-6">
      <section className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">
          Upcoming Family Events
        </h1>
        <p className="text-gray-600">
          Curated events happening in Seattle and the surrounding area — updated weekly.
        </p>
      </section>

      <Suspense fallback={null}>
        <EventsGrid events={(events ?? []) as Activity[]} />
      </Suspense>
    </div>
  )
}
