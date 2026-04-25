'use client'

import { useMemo } from 'react'
import { format, startOfWeek, addDays, parseISO, isSameDay } from 'date-fns'
import type { PlanItem } from '@/lib/types'
import PlanItemCard from './PlanItem'

interface WeeklyViewProps {
  items: PlanItem[]
  weekStart: Date
  onUpdate: (id: string, updates: Partial<PlanItem>) => void
  onDelete: (id: string) => void
  onSelectDay: (date: string) => void
}

export default function WeeklyView({ items, weekStart, onUpdate, onDelete, onSelectDay }: WeeklyViewProps) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const getItemsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return items
      .filter((item) => item.date === dateStr)
      .sort((a, b) => {
        // Timed items first, sorted by start_time; untimed items at the bottom by sort_order
        if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
        if (a.start_time) return -1
        if (b.start_time) return 1
        return (a.sort_order ?? 0) - (b.sort_order ?? 0)
      })
  }

  const isToday = (day: Date) => isSameDay(day, new Date())

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-200 overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          return (
            <div key={dateStr} className="bg-gray-50 px-2 py-2 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase">{format(day, 'EEE')}</p>
            </div>
          )
        })}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const dayItems = getItemsForDay(day)
          const dateStr = format(day, 'yyyy-MM-dd')
          return (
            <div key={dateStr} className="bg-white p-2 min-h-[14rem]">
              <button
                onClick={() => onSelectDay(dateStr)}
                className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  isToday(day)
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {format(day, 'd')}
              </button>
              <div className="space-y-1">
                {dayItems.slice(0, 8).map((item) => (
                  <PlanItemCard
                    key={item.id}
                    item={item}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    compact
                  />
                ))}
                {dayItems.length > 8 && (
                  <button
                    onClick={() => onSelectDay(dateStr)}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    +{dayItems.length - 8} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
