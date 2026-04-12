'use client'

import Link from 'next/link'
import type { Activity } from '@/lib/types'
import { getVibeEmoji, getCostDisplay } from '@/lib/utils'

interface FeaturedRowProps {
  activities: Activity[]
  onAddToPlan?: (activity: Activity) => void
  onToggleBucketList?: (activity: Activity) => void
  isOnBucketList?: (id: string) => boolean
}

export default function FeaturedRow({ activities, onAddToPlan, onToggleBucketList, isOnBucketList }: FeaturedRowProps) {
  if (activities.length === 0) return null

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-xl font-bold text-gray-900">Must-Do Activities</h2>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="flex gap-5 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 scrollbar-hide">
        {activities.map((activity) => {
          const onBucket = isOnBucketList?.(activity.id) ?? false
          return (
            <div
              key={activity.id}
              className="group flex-shrink-0 w-80 sm:w-96 rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden transition-all hover:shadow-xl hover:border-gray-300"
            >
              <Link href={`/activities/${activity.id}`} target="_blank" rel="noopener noreferrer">
                <div className="relative h-52 w-full overflow-hidden bg-gray-100">
                  {activity.image_url ? (
                    <img
                      src={activity.image_url}
                      alt={activity.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl text-gray-300">
                      🌲
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-amber-900 shadow-sm">
                      Must-Do
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
                    <h3 className="text-lg font-bold text-white leading-tight drop-shadow-sm">
                      {activity.title}
                    </h3>
                    <p className="mt-1 text-sm text-white/80">
                      {activity.area} · {getCostDisplay(activity.cost)}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="p-4">
                <p className="mb-3 text-sm text-gray-600 line-clamp-2">
                  {activity.description}
                </p>

                <div className="mb-3 flex flex-wrap gap-1.5">
                  {activity.vibes.slice(0, 3).map((vibe) => (
                    <span key={vibe} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                      {getVibeEmoji(vibe)} {vibe}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  {onToggleBucketList && (
                    <button
                      onClick={() => onToggleBucketList(activity)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        onBucket
                          ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                          : 'bg-violet-600 text-white hover:bg-violet-700'
                      }`}
                    >
                      {onBucket ? '✓ Bucket List' : '♡ Bucket List'}
                    </button>
                  )}
                  {onAddToPlan && (
                    <button
                      onClick={() => onAddToPlan(activity)}
                      className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                    >
                      + Add to Outing
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
