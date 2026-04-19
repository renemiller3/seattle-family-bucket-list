'use client'

import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { PlanItem, Outing } from '@/lib/types'
import PlanItemCard from './PlanItem'
import DriveTimeDisplay from './DriveTimeDisplay'
import EditItemModal from './EditItemModal'

interface LodgingPin {
  name: string
  lat: number
  lng: number
  address?: string | null
}

interface ItineraryViewProps {
  items: PlanItem[]
  onUpdate: (id: string, updates: Partial<PlanItem>) => void
  onDelete: (id: string) => void
  onReorder: (date: string, orderedIds: string[]) => void
  outings?: Outing[]
  lodging?: LodgingPin | null
}

const DAY_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

export default function ItineraryView({ items, onUpdate, onDelete, outings, lodging }: ItineraryViewProps) {
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

  // Compute global sequential activity numbers for mappable items (matches map marker order)
  const activityNumberMap = useMemo(() => {
    const map = new Map<string, number>()
    let counter = 1
    for (const [, dateItems] of groupedByDate) {
      for (const item of dateItems) {
        const hasCoords =
          (item.activity?.lat != null && item.activity?.lng != null) ||
          (item.lat != null && item.lng != null)
        if (hasCoords) {
          map.set(item.id, counter++)
        }
      }
    }
    return map
  }, [groupedByDate])

  const uniqueDates = useMemo(() => groupedByDate.map(([date]) => date), [groupedByDate])

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
    <div className="space-y-10">
      {groupedByDate.map(([date, dateItems], dayIndex) => (
        <section key={date}>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {format(parseISO(date), 'EEEE')}
            </h3>
            <p className="text-sm text-gray-500">
              {format(parseISO(date), 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="space-y-3 pl-5 ml-5 border-l-2 border-gray-200">
            {dateItems.map((item, index) => (
              <div key={item.id}>
                {index > 0 && item.travel_time_before && (
                  <DriveTimeDisplay minutes={item.travel_time_before} />
                )}
                <div onClick={() => setEditingItem(item)} className="cursor-pointer">
                  <PlanItemCard
                    item={item}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    outings={outings}
                    variant="outing"
                    activityNumber={activityNumberMap.get(item.id)}
                    dayColor={DAY_COLORS[uniqueDates.indexOf(item.date) % DAY_COLORS.length]}
                  />
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
          outings={outings}
        />
      )}
    </div>
  )
}
