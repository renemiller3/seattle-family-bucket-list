'use client'

import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { PlanItem } from '@/lib/types'

interface OutingSummaryProps {
  outingItems: PlanItem[]
  lodgingName: string | null
  lodgingAddress: string | null
  variant?: 'interactive' | 'readonly'
  onAddLodging?: () => void
  defaultExpanded?: boolean
}

export default function OutingSummary({
  outingItems,
  lodgingName,
  lodgingAddress,
  variant = 'interactive',
  onAddLodging,
  defaultExpanded = true,
}: OutingSummaryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const dates = useMemo(() => {
    const unique = [...new Set(outingItems.map((i) => i.date))].sort()
    if (unique.length === 0) return null
    return { start: unique[0], end: unique[unique.length - 1], count: unique.length }
  }, [outingItems])

  const activityCount = useMemo(
    () => outingItems.filter((i) => i.type !== 'life_block').length,
    [outingItems]
  )

  const area = useMemo(() => {
    const counts = new Map<string, number>()
    for (const it of outingItems) {
      const a = it.activity?.area
      if (a) counts.set(a, (counts.get(a) ?? 0) + 1)
    }
    if (counts.size === 0) return null
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
  }, [outingItems])

  const dateRangeLabel = useMemo(() => {
    if (!dates) return null
    const start = parseISO(dates.start)
    const end = parseISO(dates.end)
    if (dates.start === dates.end) {
      return format(start, 'MMM d, yyyy')
    }
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
      return `${format(start, 'MMM d')}–${format(end, 'd, yyyy')}`
    }
    if (start.getFullYear() === end.getFullYear()) {
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    }
    return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`
  }, [dates])

  const mapsHref = lodgingAddress
    ? lodgingAddress.startsWith('http')
      ? lodgingAddress
      : `https://maps.google.com/?q=${encodeURIComponent(lodgingAddress)}`
    : null

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-900">At a glance</h2>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className="grid grid-cols-1 gap-4 border-t border-gray-100 px-4 py-4 sm:grid-cols-2">
          {/* Dates */}
          <SummaryField
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
            label="Dates"
          >
            {dateRangeLabel ? (
              <p className="text-sm text-gray-900">
                {dateRangeLabel}
                <span className="ml-2 text-gray-500">
                  · {dates!.count} {dates!.count === 1 ? 'day' : 'days'}
                </span>
              </p>
            ) : (
              <p className="text-sm text-gray-400">No dates yet</p>
            )}
          </SummaryField>

          {/* Lodging */}
          <SummaryField
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            }
            label="Lodging"
          >
            {lodgingName ? (
              <>
                <p className="text-sm text-gray-900">{lodgingName}</p>
                {mapsHref && (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Open in Maps
                  </a>
                )}
              </>
            ) : variant === 'interactive' && onAddLodging ? (
              <button
                onClick={onAddLodging}
                className="text-sm text-emerald-700 hover:text-emerald-800"
              >
                No lodging yet — Add one
              </button>
            ) : (
              <p className="text-sm text-gray-400">Not set</p>
            )}
          </SummaryField>

          {/* Activities */}
          <SummaryField
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            }
            label="Activities"
          >
            <p className="text-sm text-gray-900">
              {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
            </p>
          </SummaryField>

          {/* Area */}
          <SummaryField
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            }
            label="Area"
          >
            {area ? (
              <p className="text-sm text-gray-900">{area}</p>
            ) : (
              <p className="text-sm text-gray-400">—</p>
            )}
          </SummaryField>
        </div>
      )}
    </section>
  )
}

function SummaryField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-50 text-gray-500">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        {children}
      </div>
    </div>
  )
}
