'use client'

import type { PlanItem as PlanItemType, Outing } from '@/lib/types'
import { formatTime, formatDuration } from '@/lib/utils'

interface PlanItemProps {
  item: PlanItemType
  onUpdate: (id: string, updates: Partial<PlanItemType>) => void
  onDelete: (id: string) => void
  dragHandleProps?: Record<string, unknown>
  compact?: boolean
  outings?: Outing[]
}

const TYPE_STYLES: Record<string, string> = {
  activity: 'border-l-emerald-500 bg-white',
  life_block: 'border-l-blue-400 bg-blue-50',
  custom: 'border-l-purple-400 bg-purple-50',
  restaurant: 'border-l-orange-400 bg-orange-50',
}

const LIFE_BLOCK_ICONS: Record<string, string> = {
  Nap: '😴',
  Meal: '🍽️',
  Break: '🧃',
  Travel: '🚗',
}

export default function PlanItemCard({ item, onUpdate, onDelete, dragHandleProps, compact, outings = [] }: PlanItemProps) {
  const title = item.title || item.activity?.title || 'Untitled'
  const icon = item.type === 'life_block' ? LIFE_BLOCK_ICONS[title] || '📌' : null
  const outingName = item.outing_id ? outings.find((o) => o.id === item.outing_id)?.name : null

  if (compact) {
    return (
      <div className={`rounded-md border-l-4 px-2 py-1 text-xs ${TYPE_STYLES[item.type]} ${item.is_completed ? 'opacity-50' : ''}`}>
        <span className="font-medium">{icon} {title}</span>
      </div>
    )
  }

  return (
    <div
      className={`group rounded-lg border border-gray-200 border-l-4 p-3 shadow-sm transition-shadow hover:shadow-md ${TYPE_STYLES[item.type]} ${
        item.is_completed ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="mt-0.5 shrink-0 cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="3" r="1.5" />
              <circle cx="11" cy="3" r="1.5" />
              <circle cx="5" cy="8" r="1.5" />
              <circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="13" r="1.5" />
              <circle cx="11" cy="13" r="1.5" />
            </svg>
          </button>
        )}

        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onUpdate(item.id, { is_completed: !item.is_completed }) }}
          className={`mt-0.5 shrink-0 h-5 w-5 rounded border-2 transition-colors ${
            item.is_completed
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-gray-300 hover:border-emerald-400'
          }`}
        >
          {item.is_completed && (
            <svg viewBox="0 0 16 16" fill="none" className="h-full w-full p-0.5">
              <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {icon && <span className="text-sm">{icon}</span>}
            <span className={`font-medium text-gray-900 ${item.is_completed ? 'line-through' : ''}`}>
              {title}
            </span>
            {outingName && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                {outingName}
              </span>
            )}
          </div>

          {/* Time */}
          {item.start_time && (
            <p className="mt-0.5 text-xs text-gray-500">
              {formatTime(item.start_time)}
              {item.end_time && <> - {formatTime(item.end_time)}</>}
              {item.duration_minutes && !item.end_time && <> ({formatDuration(item.duration_minutes)})</>}
            </p>
          )}

          {/* Location */}
          {item.location_url && (
            <a
              href={item.location_url.startsWith('http') ? item.location_url : `https://maps.google.com/?q=${encodeURIComponent(item.location_url)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Open in Maps
            </a>
          )}

          {/* Notes */}
          {item.notes && (
            <p className="mt-1 text-xs text-gray-500">
              {item.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
            title="Remove"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Travel time */}
      {item.travel_time_after && item.travel_time_after > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <span>🚗</span>
          <span>{item.travel_time_after} min travel</span>
        </div>
      )}
    </div>
  )
}
