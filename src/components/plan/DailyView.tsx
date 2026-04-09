'use client'

import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import type { PlanItem } from '@/lib/types'
import PlanItemCard from './PlanItem'

interface DailyViewProps {
  items: PlanItem[]
  date: string
  onUpdate: (id: string, updates: Partial<PlanItem>) => void
  onDelete: (id: string) => void
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM to 9 PM

export default function DailyView({ items, date, onUpdate, onDelete }: DailyViewProps) {
  const dayItems = useMemo(
    () => items.filter((item) => item.date === date),
    [items, date]
  )

  const timedItems = dayItems.filter((item) => item.start_time)
  const untimedItems = dayItems.filter((item) => !item.start_time)

  const getItemsForHour = (hour: number) => {
    return timedItems.filter((item) => {
      if (!item.start_time) return false
      const itemHour = parseInt(item.start_time.split(':')[0])
      return itemHour === hour
    })
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        {format(parseISO(date), 'EEEE, MMMM d')}
      </h3>

      {/* Untimed items */}
      {untimedItems.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">All Day</p>
          <div className="space-y-1">
            {untimedItems.map((item) => (
              <PlanItemCard key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="border-t border-gray-200">
        {HOURS.map((hour) => {
          const hourItems = getItemsForHour(hour)
          return (
            <div key={hour} className="flex border-b border-gray-100 min-h-[3rem]">
              <div className="w-16 shrink-0 py-2 pr-3 text-right text-xs text-gray-400">
                {format(new Date(2024, 0, 1, hour), 'h a')}
              </div>
              <div className="flex-1 py-1 pl-3 border-l border-gray-200">
                {hourItems.length > 0 ? (
                  <div className="space-y-1">
                    {hourItems.map((item) => (
                      <PlanItemCard key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
