'use client'

import Link from 'next/link'
import type { Activity } from '@/lib/types'
import { getVibeEmoji, getCostDisplay } from '@/lib/utils'

interface ActivityCardProps {
  activity: Activity
  onAddToPlan?: (activity: Activity) => void
  onToggleBucketList?: (activity: Activity) => void
  isOnBucketList?: boolean
}

export default function ActivityCard({ activity, onAddToPlan, onToggleBucketList, isOnBucketList }: ActivityCardProps) {
  const isEvent = activity.type === 'event'

  return (
    <div className="group flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-gray-300 overflow-hidden">
      {/* Image */}
      <Link href={`/activities/${activity.id}`}>
        <div className="relative h-44 w-full overflow-hidden bg-gray-100">
          {activity.image_url ? (
            <img
              src={activity.image_url}
              alt={activity.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl text-gray-300">
              🌲
            </div>
          )}
          {isEvent && (
            <span className="absolute top-2 right-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Event
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/activities/${activity.id}`}>
          <h3 className="mb-1 text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
            {activity.title}
          </h3>
          <p className="mb-3 text-sm text-gray-600 line-clamp-2">
            {activity.description}
          </p>
        </Link>

        {isEvent && activity.start_date && (
          <p className="mb-3 text-sm font-medium text-amber-700">
            {new Date(activity.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {activity.end_date && (
              <> &ndash; {new Date(activity.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
            )}
          </p>
        )}

        <div className="mb-3 flex flex-wrap gap-1.5">
          {activity.vibes.map((vibe) => (
            <span
              key={vibe}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
            >
              <span className="text-xs">{getVibeEmoji(vibe)}</span>
              {vibe}
            </span>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>{activity.area}</span>
          <span className="text-gray-300">|</span>
          <span>{getCostDisplay(activity.cost)}</span>
          <span className="text-gray-300">|</span>
          <span>{activity.age_range.join(', ')}</span>
        </div>

        {(onAddToPlan || onToggleBucketList) && (
          <div className="mt-auto flex gap-2">
            {onToggleBucketList && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  onToggleBucketList(activity)
                }}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isOnBucketList
                    ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                    : 'bg-violet-600 text-white hover:bg-violet-700'
                }`}
              >
                {isOnBucketList ? '✓ Bucket List' : '♡ Bucket List'}
              </button>
            )}
            {onAddToPlan && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  onAddToPlan(activity)
                }}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                + Add to Outing
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
