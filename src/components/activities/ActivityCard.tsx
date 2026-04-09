'use client'

import Link from 'next/link'
import type { Activity } from '@/lib/types'
import { getVibeEmoji, getCostDisplay } from '@/lib/utils'

interface ActivityCardProps {
  activity: Activity
  onAddToPlan?: (activity: Activity) => void
}

export default function ActivityCard({ activity, onAddToPlan }: ActivityCardProps) {
  const isEvent = activity.type === 'event'

  return (
    <div className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-gray-300">
      <div className="mb-3 flex items-start justify-between gap-2">
        <Link href={`/activities/${activity.id}`} className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
            {activity.title}
          </h3>
        </Link>
        {isEvent && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            Event
          </span>
        )}
      </div>

      <Link href={`/activities/${activity.id}`} className="flex-1">
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

      {onAddToPlan && (
        <button
          onClick={(e) => {
            e.preventDefault()
            onAddToPlan(activity)
          }}
          className="mt-auto w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          + Add to Plan
        </button>
      )}
    </div>
  )
}
