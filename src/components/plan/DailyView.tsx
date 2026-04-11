'use client'

import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import type { PlanItem, Outing } from '@/lib/types'
import { formatTime, formatDuration } from '@/lib/utils'
import PlanItemCard from './PlanItem'
import EditItemModal from './EditItemModal'

interface DailyViewProps {
  items: PlanItem[]
  date: string
  onUpdate: (id: string, updates: Partial<PlanItem>) => void
  onDelete: (id: string) => void
  outings?: Outing[]
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

export default function DailyView({ items, date, onUpdate, onDelete, outings }: DailyViewProps) {
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null)

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
              <div key={item.id} onClick={() => setEditingItem(item)} className="cursor-pointer">
                <PlanItemCard item={item} onUpdate={onUpdate} onDelete={onDelete} />
              </div>
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

          const title = item.title || item.activity?.title || 'Untitled'
          const isCompleted = item.is_completed
          const typeStyles: Record<string, string> = {
            activity: 'border-l-emerald-500 bg-emerald-50',
            life_block: 'border-l-blue-400 bg-blue-50',
            custom: 'border-l-purple-400 bg-purple-50',
            restaurant: 'border-l-orange-400 bg-orange-50',
          }

          return (
            <div
              key={item.id}
              className="absolute left-16 right-0 pl-3 pr-1 z-10"
              style={{ top: pos.top, height: pos.height }}
            >
              <div
                onClick={() => setEditingItem(item)}
                className={`h-full rounded-lg border border-gray-200 border-l-4 p-2 overflow-hidden cursor-pointer transition-shadow hover:shadow-md ${typeStyles[item.type] || 'bg-white'} ${isCompleted ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className={`text-sm font-medium text-gray-900 truncate ${isCompleted ? 'line-through' : ''}`}>
                      {item.type === 'life_block' && (
                        <span className="mr-1">
                          {{'Nap': '😴', 'Meal': '🍽️', 'Break': '🧃', 'Travel': '🚗'}[title] || '📌'}
                        </span>
                      )}
                      {item.activity_id ? (
                        <Link href={`/activities/${item.activity_id}`} className="hover:text-emerald-700">{title}</Link>
                      ) : title}
                    </p>
                    {item.start_time && (
                      <p className="text-xs text-gray-500">
                        {formatTime(item.start_time)}
                        {item.end_time && <> – {formatTime(item.end_time)}</>}
                        {!item.end_time && item.duration_minutes && <> ({formatDuration(item.duration_minutes)})</>}
                      </p>
                    )}
                    {item.notes && pos.height > 60 && (
                      <p className="mt-0.5 text-xs text-gray-500 truncate">{item.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(item.id)
                    }}
                    className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit modal */}
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
