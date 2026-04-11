'use client'

import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { PlanItem } from '@/lib/types'
import PlanItemCard from './PlanItem'
import DriveTimeDisplay from './DriveTimeDisplay'
import EditItemModal from './EditItemModal'

interface ItineraryViewProps {
  items: PlanItem[]
  onUpdate: (id: string, updates: Partial<PlanItem>) => void
  onDelete: (id: string) => void
  onReorder: (date: string, orderedIds: string[]) => void
}

export default function ItineraryView({ items, onUpdate, onDelete }: ItineraryViewProps) {
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null)

  const groupedByDate = useMemo(() => {
    const groups: Record<string, PlanItem[]> = {}
    for (const item of items) {
      if (!groups[item.date]) groups[item.date] = []
      groups[item.date].push(item)
    }
    // Sort items within each day by start_time (items without a time go to the end)
    for (const dateItems of Object.values(groups)) {
      dateItems.sort((a, b) => {
        if (!a.start_time && !b.start_time) return 0
        if (!a.start_time) return 1
        if (!b.start_time) return -1
        return a.start_time.localeCompare(b.start_time)
      })
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
                <div onClick={() => setEditingItem(item)} className="cursor-pointer">
                  <PlanItemCard item={item} onUpdate={onUpdate} onDelete={onDelete} />
                </div>
                {item.travel_time_after && index < dateItems.length - 1 && (
                  <DriveTimeDisplay minutes={item.travel_time_after} />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onSave={onUpdate}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  )
}
