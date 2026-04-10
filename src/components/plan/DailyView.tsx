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
const HOUR_HEIGHT = 64 // pixels per hour

function getItemPosition(item: PlanItem) {
  if (!item.start_time) return null

  const [hours, minutes] = item.start_time.split(':').map(Number)
  const startOffset = (hours - 6) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT

  let durationMinutes = item.duration_minutes
  if (!durationMinutes && item.end_time) {
    const [endH, endM] = item.end_time.split(':').map(Number)
    durationMinutes = (endH * 60 + endM) - (hours * 60 + minutes)
  }
  if (!durationMinutes) durationMinutes = 60 // default 1 hour

  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 40) // min 40px so it's readable

  return { top: startOffset, height }
}

export default function DailyView({ items, date, onUpdate, onDelete }: DailyViewProps) {
  const dayItems = useMemo(
    () => items.filter((item) => item.date === date),
    [items, date]
  )

  const timedItems = dayItems.filter((item) => item.start_time)
  const untimedItems = dayItems.filter((item) => !item.start_time)

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
      <div className="relative border-t border-gray-200">
        {/* Hour rows (background grid) */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="flex border-b border-gray-100"
            style={{ height: HOUR_HEIGHT }}
          >
            <div className="w-16 shrink-0 py-2 pr-3 text-right text-xs text-gray-400">
              {format(new Date(2024, 0, 1, hour), 'h a')}
            </div>
            <div className="flex-1 border-l border-gray-200" />
          </div>
        ))}

        {/* Positioned items overlay */}
        {timedItems.map((item) => {
          const pos = getItemPosition(item)
          if (!pos) return null
          return (
            <div
              key={item.id}
              className="absolute left-16 right-0 pl-3 pr-1 z-10"
              style={{ top: pos.top, height: pos.height }}
            >
              <div className="h-full">
                <PlanItemCard item={item} onUpdate={onUpdate} onDelete={onDelete} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
