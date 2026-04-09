'use client'

import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import type { PlanItem } from '@/lib/types'
import { formatTime, formatDuration } from '@/lib/utils'

const TYPE_STYLES: Record<string, string> = {
  activity: 'border-l-emerald-500',
  life_block: 'border-l-blue-400 bg-blue-50/50',
  custom: 'border-l-purple-400 bg-purple-50/50',
  restaurant: 'border-l-orange-400 bg-orange-50/50',
}

interface SharedPlanViewProps {
  items: PlanItem[]
  notes: string | null
  ownerName: string
}

export default function SharedPlanView({ items, notes, ownerName }: SharedPlanViewProps) {
  const groupedByDate = useMemo(() => {
    const groups: Record<string, PlanItem[]> = {}
    for (const item of items) {
      if (!groups[item.date]) groups[item.date] = []
      groups[item.date].push(item)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  return (
    <div>
      <div className="mb-8 text-center">
        <p className="text-sm text-gray-500">Shared by {ownerName}</p>
      </div>

      {groupedByDate.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No items in this plan yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByDate.map(([date, dateItems]) => (
            <section key={date}>
              <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
              </h3>
              <div className="space-y-2">
                {dateItems
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item) => {
                    const title = item.title || item.activity?.title || 'Untitled'
                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border border-gray-200 border-l-4 p-3 ${TYPE_STYLES[item.type] || ''} ${
                          item.is_completed ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {item.is_completed && <span className="text-emerald-500">&#10003;</span>}
                          <span className={`font-medium text-gray-900 ${item.is_completed ? 'line-through' : ''}`}>
                            {title}
                          </span>
                        </div>
                        {item.start_time && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {formatTime(item.start_time)}
                            {item.duration_minutes && <> ({formatDuration(item.duration_minutes)})</>}
                          </p>
                        )}
                        {item.notes && (
                          <p className="mt-1 text-xs text-gray-500">{item.notes}</p>
                        )}
                      </div>
                    )
                  })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-gray-600">{notes}</p>
        </div>
      )}
    </div>
  )
}
