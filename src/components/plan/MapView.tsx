'use client'

import { useState, useMemo } from 'react'
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps'
import { format, parseISO } from 'date-fns'
import type { PlanItem } from '@/lib/types'
import { formatTime } from '@/lib/utils'
import Link from 'next/link'

interface MapViewProps {
  items: PlanItem[]
}

const DAY_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
]

export default function MapView({ items }: MapViewProps) {
  const [selectedItem, setSelectedItem] = useState<PlanItem | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

  // Filter to items with coordinates (from activity OR from plan_item itself)
  const mappableItems = useMemo(() => {
    return items.filter(
      (item) => (item.activity?.lat != null && item.activity?.lng != null) || (item.lat != null && item.lng != null)
    )
  }, [items])

  // Get unique dates for color coding
  const uniqueDates = useMemo(() => {
    const dates = [...new Set(mappableItems.map((item) => item.date))].sort()
    return dates
  }, [mappableItems])

  const getColorForDate = (date: string) => {
    const index = uniqueDates.indexOf(date)
    return DAY_COLORS[index % DAY_COLORS.length]
  }

  const getCoords = (item: PlanItem) => ({
    lat: item.activity?.lat ?? item.lat ?? 0,
    lng: item.activity?.lng ?? item.lng ?? 0,
  })

  // Calculate center from items, default to Seattle
  const center = useMemo(() => {
    if (mappableItems.length === 0) return { lat: 47.6062, lng: -122.3321 }
    const lats = mappableItems.map((i) => getCoords(i).lat)
    const lngs = mappableItems.map((i) => getCoords(i).lng)
    return {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
    }
  }, [mappableItems])

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">Google Maps API key not configured.</p>
      </div>
    )
  }

  if (mappableItems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-lg text-gray-500">No activities with locations on your calendar.</p>
        <p className="mt-1 text-sm text-gray-400">Add activities from Discover to see them on the map.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      {uniqueDates.length > 1 && (
        <div className="flex flex-wrap gap-3 text-xs">
          {uniqueDates.map((date) => (
            <div key={date} className="flex items-center gap-1.5">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: getColorForDate(date) }}
              />
              <span className="text-gray-600">
                {format(parseISO(date), 'EEE, MMM d')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="h-[500px] w-full overflow-hidden rounded-xl border border-gray-200">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={center}
            defaultZoom={mappableItems.length === 1 ? 13 : 10}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapId="bucket-list-map"
          >
            {mappableItems.map((item) => {
              const title = item.title || item.activity?.title || 'Untitled'
              const color = getColorForDate(item.date)
              return (
                <AdvancedMarker
                  key={item.id}
                  position={getCoords(item)}
                  onClick={() => setSelectedItem(item)}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-md text-white text-xs font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {uniqueDates.indexOf(item.date) + 1}
                  </div>
                </AdvancedMarker>
              )
            })}

            {selectedItem && (getCoords(selectedItem).lat !== 0) && (
              <InfoWindow
                position={getCoords(selectedItem)}
                onCloseClick={() => setSelectedItem(null)}
                pixelOffset={[0, -35]}
              >
                <div className="max-w-[200px] p-1">
                  <p className="font-semibold text-gray-900 text-sm">
                    {selectedItem.title || selectedItem.activity?.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(parseISO(selectedItem.date), 'EEE, MMM d')}
                    {selectedItem.start_time && <> at {formatTime(selectedItem.start_time)}</>}
                  </p>
                  {selectedItem.activity_id && (
                    <Link
                      href={`/activities/${selectedItem.activity_id}`}
                      className="mt-1 inline-block text-xs text-emerald-600 hover:text-emerald-700"
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
    </div>
  )
}
