'use client'

import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps'
import type { PlanItem } from '@/lib/types'
import { formatTime, formatDuration } from '@/lib/utils'

interface SharedPlanViewProps {
  items: PlanItem[]
  notes: string | null
  ownerName: string
  outingName?: string | null
}

const LIFE_BLOCK_ICONS: Record<string, string> = {
  'Nap': '😴', 'Meal': '🍽️', 'Break': '🧃', 'Travel': '🚗',
}

const DAY_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

export default function SharedPlanView({ items, notes, ownerName, outingName }: SharedPlanViewProps) {
  const [showMap, setShowMap] = useState(false)
  const [selectedMapItem, setSelectedMapItem] = useState<PlanItem | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
  const groupedByDate = useMemo(() => {
    const groups: Record<string, PlanItem[]> = {}
    for (const item of items) {
      if (!groups[item.date]) groups[item.date] = []
      groups[item.date].push(item)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  // Find the best hero image from activities
  const heroImage = useMemo(() => {
    for (const item of items) {
      if (item.activity?.image_url) return item.activity.image_url
    }
    return null
  }, [items])

  // Count unique activities (not life blocks)
  const activityCount = useMemo(() => {
    return items.filter((i) => i.type === 'activity' && i.activity_id).length
  }, [items])

  const dayCount = groupedByDate.length

  // Items with coordinates for the map, sorted by date/time to match list order
  const mappableItems = useMemo(() => {
    return items
      .filter(
        (item) => (item.activity?.lat != null && item.activity?.lng != null) || (item.lat != null && item.lng != null)
      )
      .sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date)
        if (dateCmp !== 0) return dateCmp
        if (!a.start_time && !b.start_time) return 0
        if (!a.start_time) return 1
        if (!b.start_time) return -1
        return a.start_time.localeCompare(b.start_time)
      })
  }, [items])

  const getCoords = (item: PlanItem) => ({
    lat: item.activity?.lat ?? item.lat ?? 0,
    lng: item.activity?.lng ?? item.lng ?? 0,
  })

  const uniqueDates = useMemo(() => {
    return [...new Set(items.map((i) => i.date))].sort()
  }, [items])

  const mapCenter = useMemo(() => {
    if (mappableItems.length === 0) return { lat: 47.6062, lng: -122.3321 }
    const lats = mappableItems.map((i) => getCoords(i).lat)
    const lngs = mappableItems.map((i) => getCoords(i).lng)
    return {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
    }
  }, [mappableItems])

  // Compute global sequential activity numbers for mappable items (matches map marker order)
  const activityNumberMap = useMemo(() => {
    const map = new Map<string, number>()
    let counter = 1
    for (const [, dateItems] of groupedByDate) {
      const sorted = [...dateItems].sort((a, b) => {
        if (!a.start_time && !b.start_time) return 0
        if (!a.start_time) return 1
        if (!b.start_time) return -1
        return a.start_time.localeCompare(b.start_time)
      })
      for (const item of sorted) {
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

  if (groupedByDate.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">No items in this plan yet.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Hero */}
      <div className="relative mb-8 -mx-4 sm:-mx-6 overflow-hidden rounded-none sm:rounded-2xl">
        {heroImage ? (
          <div className="relative h-64 sm:h-80">
            <img src={heroImage} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              {outingName && (
                <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">
                  {outingName}
                </h1>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-white/80 text-sm">
                <span>Planned by {ownerName}</span>
                <span className="text-white/50">·</span>
                <span>{dayCount} {dayCount === 1 ? 'day' : 'days'}</span>
                <span className="text-white/50">·</span>
                <span>{activityCount} {activityCount === 1 ? 'activity' : 'activities'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-600 p-8 sm:p-10">
            {outingName && (
              <h1 className="text-3xl sm:text-4xl font-bold text-white">{outingName}</h1>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-emerald-100 text-sm">
              <span>Planned by {ownerName}</span>
              <span className="text-emerald-200/50">·</span>
              <span>{dayCount} {dayCount === 1 ? 'day' : 'days'}</span>
              <span className="text-emerald-200/50">·</span>
              <span>{activityCount} {activityCount === 1 ? 'activity' : 'activities'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Map toggle */}
      {apiKey && mappableItems.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
              <path d="M8 2v16" />
              <path d="M16 6v16" />
            </svg>
            {showMap ? 'Hide Map' : 'View on Map'}
          </button>

          {showMap && (
            <div className="mt-3 h-[350px] w-full overflow-hidden rounded-xl border border-gray-200">
              <APIProvider apiKey={apiKey}>
                <Map
                  defaultCenter={mapCenter}
                  defaultZoom={mappableItems.length === 1 ? 13 : 10}
                  gestureHandling="cooperative"
                  disableDefaultUI={false}
                  mapId="shared-plan-map"
                >
                  {mappableItems.map((item, index) => {
                    const coords = getCoords(item)
                    const dayIndex = uniqueDates.indexOf(item.date)
                    const color = DAY_COLORS[dayIndex % DAY_COLORS.length]
                    return (
                      <AdvancedMarker
                        key={item.id}
                        position={coords}
                        onClick={() => setSelectedMapItem(item)}
                      >
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-md text-white text-xs font-bold"
                          style={{ backgroundColor: color }}
                        >
                          {index + 1}
                        </div>
                      </AdvancedMarker>
                    )
                  })}

                  {selectedMapItem && (
                    <InfoWindow
                      position={getCoords(selectedMapItem)}
                      onCloseClick={() => setSelectedMapItem(null)}
                      pixelOffset={[0, -35]}
                    >
                      <div className="w-[200px] pr-4">
                        <p className="font-semibold text-gray-900 text-sm leading-tight">
                          {selectedMapItem.title || selectedMapItem.activity?.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {format(parseISO(selectedMapItem.date), 'EEE, MMM d')}
                          {selectedMapItem.start_time && <> at {formatTime(selectedMapItem.start_time)}</>}
                        </p>
                        {selectedMapItem.activity_id && (
                          <Link
                            href={`/activities/${selectedMapItem.activity_id}`}
                            className="mt-1 inline-block text-xs font-medium text-emerald-600 hover:text-emerald-700"
                          >
                            View details →
                          </Link>
                        )}
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            </div>
          )}

          {/* Legend */}
          {showMap && uniqueDates.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {uniqueDates.map((date, i) => (
                <div key={date} className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: DAY_COLORS[i % DAY_COLORS.length] }} />
                  <span className="text-gray-600">{format(parseISO(date), 'EEE, MMM d')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Day sections */}
      <div className="space-y-10">
        {groupedByDate.map(([date, dateItems], dayIndex) => {
          const sorted = [...dateItems].sort((a, b) => {
            if (!a.start_time && !b.start_time) return 0
            if (!a.start_time) return 1
            if (!b.start_time) return -1
            return a.start_time.localeCompare(b.start_time)
          })

          return (
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
                {sorted.map((item) => {
                  const title = item.title || item.activity?.title || 'Untitled'
                  const icon = item.type === 'life_block' ? LIFE_BLOCK_ICONS[title] || '📌' : null
                  const imageUrl = item.image_url || item.activity?.image_url
                  const description = item.activity?.description
                  const isLifeBlock = item.type === 'life_block'

                  const isSimpleLifeBlock = isLifeBlock && !imageUrl
                  const itemActivityNumber = activityNumberMap.get(item.id)
                  const itemDayColor = DAY_COLORS[uniqueDates.indexOf(item.date) % DAY_COLORS.length]

                  if (isSimpleLifeBlock) {
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5">
                        {itemActivityNumber != null && (
                          <div
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold"
                            style={{ backgroundColor: itemDayColor }}
                          >
                            {itemActivityNumber}
                          </div>
                        )}
                        {icon && <span className="text-lg">{icon}</span>}
                        <span className="text-sm font-medium text-gray-600">{title}</span>
                        {item.start_time && (
                          <span className="text-xs text-gray-400">
                            {formatTime(item.start_time)}
                            {item.duration_minutes && <> · {formatDuration(item.duration_minutes)}</>}
                          </span>
                        )}
                        {item.location_url && (
                          <a
                            href={item.location_url.startsWith('http') ? item.location_url : `https://maps.google.com/?q=${encodeURIComponent(item.location_url)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 shrink-0"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            Open in Maps
                          </a>
                        )}
                      </div>
                    )
                  }

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      {imageUrl && (
                        <div className="h-40 w-full overflow-hidden bg-gray-100">
                          <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start gap-2">
                          {itemActivityNumber != null && (
                            <div
                              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold"
                              style={{ backgroundColor: itemDayColor }}
                            >
                              {itemActivityNumber}
                            </div>
                          )}
                          <div className="flex-1">
                            {item.activity_id ? (
                              <Link
                                href={`/activities/${item.activity_id}`}
                                className="text-lg font-semibold text-gray-900 hover:text-emerald-700 transition-colors"
                              >
                                {title}
                              </Link>
                            ) : (
                              <p className="text-lg font-semibold text-gray-900">{title}</p>
                            )}
                            {item.start_time && (
                              <p className="mt-0.5 text-sm text-gray-500">
                                {formatTime(item.start_time)}
                                {item.end_time && <> – {formatTime(item.end_time)}</>}
                                {!item.end_time && item.duration_minutes && <> · {formatDuration(item.duration_minutes)}</>}
                              </p>
                            )}
                          </div>
                        </div>
                        {description && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{description}</p>
                        )}
                        {item.notes && (
                          <p className="mt-2 text-xs text-gray-500 italic">{item.notes}</p>
                        )}
                        {item.location_url && (
                          <a
                            href={item.location_url.startsWith('http') ? item.location_url : `https://maps.google.com/?q=${encodeURIComponent(item.location_url)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            Open in Maps
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {/* Notes */}
      {notes && (
        <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">Notes & Logistics</h3>
          <p className="whitespace-pre-wrap text-sm text-gray-600">{notes}</p>
        </div>
      )}
    </div>
  )
}
