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
    return items.filter((item) => item.date === dateStr)
  }

  const isToday = (day: Date) => isSameDay(day, new Date())

  return (
    <div className="grid grid-cols-7 gap-px rounded-xl border border-gray-200 bg-gray-200 overflow-hidden">
      {days.map((day) => {
        const dayItems = getItemsForDay(day)
        const dateStr = format(day, 'yyyy-MM-dd')
        return (
          <div key={dateStr} className="bg-white p-2 min-h-[8rem]">
            <button
              onClick={() => onSelectDay(dateStr)}
              className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                isToday(day)
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {format(day, 'd')}
            </button>
            <p className="mb-1 text-xs text-gray-400">{format(day, 'EEE')}</p>
            <div className="space-y-1">
              {dayItems.slice(0, 3).map((item) => (
                <PlanItemCard
                  key={item.id}
                  item={item}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  compact
                />
              ))}
              {dayItems.length > 3 && (
                <button
                  onClick={() => onSelectDay(dateStr)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  +{dayItems.length - 3} more
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
