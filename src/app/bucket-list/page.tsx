'use client'

import { useAuth } from '@/hooks/useAuth'
import { useBucketList } from '@/hooks/useBucketList'
import Link from 'next/link'
import { getVibeEmoji, getCostDisplay } from '@/lib/utils'

export default function BucketListPage() {
  const { user, loading: authLoading } = useAuth()
  const { items, loading: listLoading, isCompleted, removeFromBucketList } = useBucketList(user?.id)

  if (authLoading) {
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
        <h1 className="mb-2 text-2xl font-bold text-gray-900">My Bucket List</h1>
        <p className="mb-6 text-gray-600">Sign in to start building your family bucket list.</p>
        <Link href="/" className="text-emerald-600 hover:text-emerald-700 underline">
          Browse activities
        </Link>
      </div>
    )
  }

  if (listLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-200" />
        </div>
      </div>
    )
  }

  const todoItems = items.filter((item) => !isCompleted(item.activity_id))
  const doneItems = items.filter((item) => isCompleted(item.activity_id))

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Bucket List</h1>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-lg text-gray-500">Your bucket list is empty.</p>
          <p className="mt-1 text-sm text-gray-400">
            Head to Discover to find activities and add them to your bucket list.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Discover Activities
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* To Do */}
          {todoItems.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                To Do ({todoItems.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {todoItems.map(({ activity_id, activity }) => (
                  <Link
                    key={activity_id}
                    href={`/activities/${activity_id}`}
                    className="group flex gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-gray-300"
                  >
                    {activity.image_url && (
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        <img src={activity.image_url} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
                        {activity.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {activity.area} · {getCostDisplay(activity.cost)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {activity.vibes.slice(0, 2).map((vibe) => (
                          <span key={vibe} className="text-[10px] text-gray-500">
                            {getVibeEmoji(vibe)} {vibe}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Done */}
          {doneItems.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Memories ({doneItems.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {doneItems.map(({ activity_id, activity }) => (
                  <Link
                    key={activity_id}
                    href={`/activities/${activity_id}`}
                    className="group flex gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-gray-300"
                  >
                    {activity.image_url && (
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 opacity-75">
                        <img src={activity.image_url} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                            <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <h3 className="font-semibold text-gray-500 line-through truncate">
                          {activity.title}
                        </h3>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {activity.area} · {getCostDisplay(activity.cost)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
