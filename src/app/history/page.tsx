'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import type { PlanItem, ActivityPhoto, Outing } from '@/lib/types'
import PhotoGallery from '@/components/photos/PhotoGallery'
import PhotoUpload from '@/components/photos/PhotoUpload'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'

interface CompletedActivity {
  item: PlanItem
  photos: ActivityPhoto[]
}

interface PastOuting {
  outing: Outing
  earliest: string
  latest: string
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const [pastOutings, setPastOutings] = useState<PastOuting[]>([])
  const [completed, setCompleted] = useState<CompletedActivity[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchData = async () => {
    if (!user) return

    const today = format(new Date(), 'yyyy-MM-dd')

    const [
      { data: items },
      { data: photos },
      { data: allOutings },
      { data: outingItems },
    ] = await Promise.all([
      supabase
        .from('plan_items')
        .select('*, activity:activities(*)')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .neq('type', 'life_block')
        .order('date', { ascending: false }),
      supabase
        .from('activity_photos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('outings')
        .select('*')
        .eq('user_id', user.id),
      supabase
        .from('plan_items')
        .select('outing_id, date')
        .eq('user_id', user.id)
        .not('outing_id', 'is', null),
    ])

    // Compute date ranges per outing
    const earliestMap = new Map<string, string>()
    const latestMap = new Map<string, string>()
    for (const item of outingItems ?? []) {
      if (!item.outing_id) continue
      const curE = earliestMap.get(item.outing_id)
      if (!curE || item.date < curE) earliestMap.set(item.outing_id, item.date)
      const curL = latestMap.get(item.outing_id)
      if (!curL || item.date > curL) latestMap.set(item.outing_id, item.date)
    }

    const past = (allOutings ?? [])
      .filter((o) => {
        const latest = latestMap.get(o.id)
        return latest && latest < today
      })
      .sort((a, b) => {
        const da = latestMap.get(a.id) ?? ''
        const db = latestMap.get(b.id) ?? ''
        return db.localeCompare(da)
      })
      .map((o) => ({
        outing: o as Outing,
        earliest: earliestMap.get(o.id)!,
        latest: latestMap.get(o.id)!,
      }))

    setPastOutings(past)

    if (items) {
      const result: CompletedActivity[] = items.map((item: any) => ({
        item,
        photos: (photos ?? []).filter((p: ActivityPhoto) => p.activity_id === item.activity_id),
      }))
      setCompleted(result)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchData()
    else setLoading(false)
  }, [user])

  const handleDeletePhoto = async (photoId: string) => {
    await supabase.from('activity_photos').delete().eq('id', photoId)
    fetchData()
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-200" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Memories</h1>
        <p className="text-gray-600">Sign in to see your completed activities and photos.</p>
      </div>
    )
  }

  const formatDateRange = (earliest: string, latest: string) => {
    const e = parseISO(earliest)
    const l = parseISO(latest)
    if (earliest === latest) return format(e, 'MMMM d, yyyy')
    if (e.getFullYear() === l.getFullYear()) {
      return `${format(e, 'MMM d')} – ${format(l, 'MMM d, yyyy')}`
    }
    return `${format(e, 'MMM d, yyyy')} – ${format(l, 'MMM d, yyyy')}`
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Memories</h1>

      {pastOutings.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-base font-semibold text-gray-700">Past Outings</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pastOutings.map(({ outing, earliest, latest }) => (
              <div key={outing.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div>
                  <div className="font-medium text-gray-900">{outing.name}</div>
                  <div className="mt-0.5 text-sm text-gray-500">{formatDateRange(earliest, latest)}</div>
                </div>
                <Link
                  href="/plan"
                  className="ml-4 shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {completed.length === 0 && pastOutings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-lg text-gray-500">No completed activities yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Mark activities as done in your calendar to start building memories.
          </p>
          <Link href="/plan" className="mt-4 inline-block text-emerald-600 hover:text-emerald-700 underline">
            Go to Calendar
          </Link>
        </div>
      ) : completed.length > 0 ? (
        <>
          {pastOutings.length > 0 && (
            <h2 className="mb-3 text-base font-semibold text-gray-700">Completed Activities</h2>
          )}
          <div className="space-y-8">
            {completed.map(({ item, photos }) => {
              const title = item.title || item.activity?.title || 'Untitled'
              return (
                <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.activity_id ? (
                          <Link href={`/activities/${item.activity_id}`} className="hover:text-emerald-700">
                            {title}
                          </Link>
                        ) : (
                          title
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {format(parseISO(item.date), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      Completed
                    </span>
                  </div>

                  {photos.length > 0 && (
                    <div className="mb-3">
                      <PhotoGallery photos={photos} onDelete={handleDeletePhoto} />
                    </div>
                  )}

                  {item.activity_id && (
                    <PhotoUpload
                      activityId={item.activity_id}
                      planItemId={item.id}
                      dateCompleted={item.date}
                      onUploaded={fetchData}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}
