'use client'

import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import type { PlanItem } from '@/lib/types'
import PlanItemCard from './PlanItem'
import DriveTimeDisplay from './DriveTimeDisplay'

interface ItineraryViewProps {
  items: PlanItem[]
  onUpdate: (id: string, updates: Partial<PlanItem>) => void
  onDelete: (id: string) => void
  onReorder: (date: string, orderedIds: string[]) => void
}

export default function ItineraryView({ items, onUpdate, onDelete }: ItineraryViewProps) {
  const groupedByDate = useMemo(() => {
    const groups: Record<string, PlanItem[]> = {}
    for (const item of items) {
      if (!groups[item.date]) groups[item.date] = []
      groups[item.date].push(item)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-lg text-gray-500">No items in your plan yet.</p>
        <p className="mt-1 text-sm text-gray-400">
          Head to Discover to find activities and add them to your calendar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {groupedByDate.map(([date, dateItems]) => (
        <section key={date}>
          <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
          </h3>
          <div className="space-y-1">
            {dateItems.map((item, index) => (
              <div key={item.id}>
                {index > 0 && item.travel_time_before && (
                  <DriveTimeDisplay minutes={item.travel_time_before} />
                )}
                <PlanItemCard item={item} onUpdate={onUpdate} onDelete={onDelete} />
                {item.travel_time_after && index < dateItems.length - 1 && (
                  <DriveTimeDisplay minutes={item.travel_time_after} />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
