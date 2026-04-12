'use client'

import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import type { PlanItem } from '@/lib/types'
import { formatTime, formatDuration } from '@/lib/utils'

interface SharedPlanViewProps {
  items: PlanItem[]
  notes: string | null
  ownerName: string
  outingName?: string | null
}

const LIFE_BLOCK_ICONS: Record<string, string> = {
  'Nap': '😴', 'Meal': '🍽️', 'Break': '🧃', 'Travel': '🚗',
}

export default function SharedPlanView({ items, notes, ownerName, outingName }: SharedPlanViewProps) {
  const groupedByDate = useMemo(() => {
    const groups: Record<string, PlanItem[]> = {}
    for (const item of items) {
      if (!groups[item.date]) groups[item.date] = []
      groups[item.date].push(item)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  // Find the best hero image from activities
  const heroImage = useMemo(() => {
    for (const item of items) {
      if (item.activity?.image_url) return item.activity.image_url
    }
    return null
  }, [items])

  // Count unique activities (not life blocks)
  const activityCount = useMemo(() => {
    return items.filter((i) => i.type === 'activity' && i.activity_id).length
  }, [items])

  const dayCount = groupedByDate.length

  if (groupedByDate.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">No items in this plan yet.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Hero */}
      <div className="relative mb-8 -mx-4 sm:-mx-6 overflow-hidden rounded-none sm:rounded-2xl">
        {heroImage ? (
          <div className="relative h-64 sm:h-80">
            <img src={heroImage} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              {outingName && (
                <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">
                  {outingName}
                </h1>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-white/80 text-sm">
                <span>Planned by {ownerName}</span>
                <span className="text-white/50">·</span>
                <span>{dayCount} {dayCount === 1 ? 'day' : 'days'}</span>
                <span className="text-white/50">·</span>
                <span>{activityCount} {activityCount === 1 ? 'activity' : 'activities'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-600 p-8 sm:p-10">
            {outingName && (
              <h1 className="text-3xl sm:text-4xl font-bold text-white">{outingName}</h1>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-emerald-100 text-sm">
              <span>Planned by {ownerName}</span>
              <span className="text-emerald-200/50">·</span>
              <span>{dayCount} {dayCount === 1 ? 'day' : 'days'}</span>
              <span className="text-emerald-200/50">·</span>
              <span>{activityCount} {activityCount === 1 ? 'activity' : 'activities'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Day sections */}
      <div className="space-y-10">
        {groupedByDate.map(([date, dateItems], dayIndex) => {
          const sorted = [...dateItems].sort((a, b) => {
            if (!a.start_time && !b.start_time) return 0
            if (!a.start_time) return 1
            if (!b.start_time) return -1
            return a.start_time.localeCompare(b.start_time)
          })

          return (
            <section key={date}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm">
                  {dayIndex + 1}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {format(parseISO(date), 'EEEE')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {format(parseISO(date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pl-5 ml-5 border-l-2 border-gray-200">
                {sorted.map((item) => {
                  const title = item.title || item.activity?.title || 'Untitled'
                  const icon = item.type === 'life_block' ? LIFE_BLOCK_ICONS[title] || '📌' : null
                  const imageUrl = item.activity?.image_url
                  const description = item.activity?.description
                  const isLifeBlock = item.type === 'life_block'

                  if (isLifeBlock) {
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5">
                        {icon && <span className="text-lg">{icon}</span>}
                        <span className="text-sm font-medium text-gray-600">{title}</span>
                        {item.start_time && (
                          <span className="text-xs text-gray-400">
                            {formatTime(item.start_time)}
                            {item.duration_minutes && <> · {formatDuration(item.duration_minutes)}</>}
                          </span>
                        )}
                      </div>
                    )
                  }

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      {imageUrl && (
                        <div className="h-40 w-full overflow-hidden bg-gray-100">
                          <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {item.activity_id ? (
                              <Link
                                href={`/activities/${item.activity_id}`}
                                className="text-lg font-semibold text-gray-900 hover:text-emerald-700 transition-colors"
                              >
                                {title}
                              </Link>
                            ) : (
                              <p className="text-lg font-semibold text-gray-900">{title}</p>
                            )}
                            {item.start_time && (
                              <p className="mt-0.5 text-sm text-gray-500">
                                {formatTime(item.start_time)}
                                {item.end_time && <> – {formatTime(item.end_time)}</>}
                                {!item.end_time && item.duration_minutes && <> · {formatDuration(item.duration_minutes)}</>}
                              </p>
                            )}
                          </div>
                        </div>
                        {description && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{description}</p>
                        )}
                        {item.notes && (
                          <p className="mt-2 text-xs text-gray-500 italic">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {/* Notes */}
      {notes && (
        <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">Notes & Logistics</h3>
          <p className="whitespace-pre-wrap text-sm text-gray-600">{notes}</p>
        </div>
      )}
    </div>
  )
}
