'use client'

import { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns'
import type { PlanItem } from '@/lib/types'

interface MonthlyViewProps {
  items: PlanItem[]
  month: Date
  onSelectDay: (date: string) => void
}

export default function MonthlyView({ items, month, onSelectDay }: MonthlyViewProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)

    const days: Date[] = []
    let current = calStart
    while (current <= calEnd) {
      days.push(current)
      current = addDays(current, 1)
    }
    return days
  }, [month])

  const getItemCountForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return items.filter((item) => item.date === dateStr).length
  }

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px rounded-xl border border-gray-200 bg-gray-200 overflow-hidden">
        {calendarDays.map((day) => {
          const count = getItemCountForDay(day)
          const inMonth = isSameMonth(day, month)
          const today = isToday(day)
          const dateStr = format(day, 'yyyy-MM-dd')

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDay(dateStr)}
              className={`min-h-[4.5rem] p-2 text-left transition-colors ${
                inMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400'
              }`}
            >
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                  today
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'font-medium'
                }`}
              >
                {format(day, 'd')}
              </span>
              {count > 0 && (
                <div className="mt-1 flex gap-0.5">
                  {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                    <div key={i} className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  ))}
                  {count > 4 && (
                    <span className="text-[10px] text-gray-400">+{count - 4}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
