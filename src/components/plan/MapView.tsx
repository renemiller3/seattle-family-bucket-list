'use client'

import { useState, useMemo, useCallback } from 'react'
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps'
import { format, parseISO } from 'date-fns'
import type { PlanItem } from '@/lib/types'
import { formatTime } from '@/lib/utils'
import Link from 'next/link'

interface LodgingPin {
  name: string
  lat: number
  lng: number
  address?: string | null
}

interface HomeLocation {
  lat: number
  lng: number
  address: string
}

interface MapViewProps {
  items: PlanItem[]
  lodging?: LodgingPin | null
  homeLocation?: HomeLocation | null
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

interface DriveInfo {
  distanceText: string
  durationText: string
}

export default function MapView({ items, lodging, homeLocation }: MapViewProps) {
  const [selectedItem, setSelectedItem] = useState<PlanItem | null>(null)
  const [showLodgingInfo, setShowLodgingInfo] = useState(false)
  const [driveCache, setDriveCache] = useState<Record<string, DriveInfo>>({})
  const [loadingDrive, setLoadingDrive] = useState(false)

  // Hide home pin when this outing has a lodging pin — home is far away and not useful here
  const showHomePin = Boolean(homeLocation && !lodging)

  const fetchDrive = useCallback(async (item: PlanItem) => {
    const coords = { lat: item.activity?.lat ?? item.lat, lng: item.activity?.lng ?? item.lng }
    if (!homeLocation || !coords.lat || !coords.lng) return
    const key = item.id
    if (driveCache[key]) return
    setLoadingDrive(true)
    try {
      const res = await fetch('/api/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: homeLocation.lat,
          originLng: homeLocation.lng,
          destLat: coords.lat,
          destLng: coords.lng,
        }),
      })
      const data = await res.json()
      if (data.durationText) setDriveCache((prev) => ({ ...prev, [key]: data }))
    } finally {
      setLoadingDrive(false)
    }
  }, [homeLocation, driveCache])

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

  // Filter to items with coordinates, sorted by date then start_time (matches list view order)
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

  // Calculate center and zoom from items + lodging + home
  const center = useMemo(() => {
    const allLats = mappableItems.map((i) => getCoords(i).lat)
    const allLngs = mappableItems.map((i) => getCoords(i).lng)
    if (lodging) { allLats.push(lodging.lat); allLngs.push(lodging.lng) }
    if (allLats.length === 0) return { lat: 47.6062, lng: -122.3321 }
    return {
      lat: allLats.reduce((a, b) => a + b, 0) / allLats.length,
      lng: allLngs.reduce((a, b) => a + b, 0) / allLngs.length,
    }
  }, [mappableItems, lodging])

  const autoZoom = useMemo(() => {
    const allLats = mappableItems.map((i) => getCoords(i).lat)
    const allLngs = mappableItems.map((i) => getCoords(i).lng)
    if (lodging) { allLats.push(lodging.lat); allLngs.push(lodging.lng) }
    // Note: home pin intentionally excluded from zoom calc so it doesn't shrink the view
    if (allLats.length <= 1) return 13
    const lats = allLats
    const lngs = allLngs
    const latSpread = Math.max(...lats) - Math.min(...lats)
    const lngSpread = Math.max(...lngs) - Math.min(...lngs)
    const maxSpread = Math.max(latSpread, lngSpread)
    // Rough zoom calculation — tighter spread = more zoomed in
    if (maxSpread < 0.01) return 15
    if (maxSpread < 0.05) return 13
    if (maxSpread < 0.1) return 12
    if (maxSpread < 0.3) return 11
    if (maxSpread < 0.5) return 10
    if (maxSpread < 1) return 9
    return 8
  }, [mappableItems])

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">Google Maps API key not configured.</p>
      </div>
    )
  }

  if (mappableItems.length === 0 && !lodging) {
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
      {(uniqueDates.length > 1 || lodging || showHomePin) && (
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
          {lodging && (
            <div className="flex items-center gap-1.5">
              <div className="flex h-3 w-3 items-center justify-center rounded-sm bg-gray-700">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </div>
              <span className="text-gray-600">{lodging.name}</span>
            </div>
          )}
          {showHomePin && (
            <div className="flex items-center gap-1.5">
              <div className="flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 text-[8px]">
                🏠
              </div>
              <span className="text-gray-600">Home</span>
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="h-[500px] w-full overflow-hidden rounded-xl border border-gray-200">
        <APIProvider apiKey={apiKey}>
          <Map
            key={`${center.lat}-${center.lng}-${autoZoom}`}
            defaultCenter={center}
            defaultZoom={autoZoom}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapId="bucket-list-map"
          >
            {mappableItems.map((item, index) => {
              const color = getColorForDate(item.date)
              return (
                <AdvancedMarker
                  key={item.id}
                  position={getCoords(item)}
                  onClick={() => { setSelectedItem(item); fetchDrive(item) }}
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

            {selectedItem && (getCoords(selectedItem).lat !== 0) && (
              <InfoWindow
                position={getCoords(selectedItem)}
                onCloseClick={() => setSelectedItem(null)}
                pixelOffset={[0, -35]}
              >
                <div style={{ width: 200, paddingRight: 16, fontFamily: 'system-ui, sans-serif' }}>
                  <p style={{ fontWeight: 600, color: '#111827', fontSize: 14, lineHeight: 1.3, margin: 0 }}>
                    {selectedItem.title || selectedItem.activity?.title}
                  </p>
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 0 }}>
                    {format(parseISO(selectedItem.date), 'EEE, MMM d')}
                    {selectedItem.start_time && <> at {formatTime(selectedItem.start_time)}</>}
                  </p>
                  {homeLocation && (
                    <p style={{ fontSize: 12, color: '#2563eb', marginTop: 4, marginBottom: 0 }}>
                      {driveCache[selectedItem.id]
                        ? `🚗 ${driveCache[selectedItem.id].durationText} · ${driveCache[selectedItem.id].distanceText}`
                        : loadingDrive
                        ? 'Calculating drive time…'
                        : ''}
                    </p>
                  )}
                  {selectedItem.activity_id && (
                    <Link
                      href={`/activities/${selectedItem.activity_id}`}
                      style={{ display: 'inline-block', marginTop: 6, fontSize: 12, fontWeight: 500, color: '#059669', textDecoration: 'none' }}
                    >
                      View details →
                    </Link>
                  )}
                </div>
              </InfoWindow>
            )}

            {/* Lodging marker */}
            {lodging && (
              <AdvancedMarker
                position={{ lat: lodging.lat, lng: lodging.lng }}
                onClick={() => { setShowLodgingInfo(true); setSelectedItem(null) }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-white bg-gray-700 shadow-md">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
              </AdvancedMarker>
            )}

            {lodging && showLodgingInfo && (
              <InfoWindow
                position={{ lat: lodging.lat, lng: lodging.lng }}
                onCloseClick={() => setShowLodgingInfo(false)}
                pixelOffset={[0, -40]}
              >
                <div style={{ width: 180, fontFamily: 'system-ui, sans-serif' }}>
                  <p style={{ fontWeight: 600, color: '#111827', fontSize: 14, lineHeight: 1.3, margin: 0 }}>
                    {lodging.name}
                  </p>
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 0 }}>Lodging</p>
                  {lodging.address && (
                    <a
                      href={lodging.address.startsWith('http') ? lodging.address : `https://maps.google.com/?q=${encodeURIComponent(lodging.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', marginTop: 4, fontSize: 12, fontWeight: 500, color: '#059669', textDecoration: 'none' }}
                    >
                      Open in Maps →
                    </a>
                  )}
                </div>
              </InfoWindow>
            )}

            {/* Home pin — hidden when this outing has lodging */}
            {showHomePin && homeLocation && (
              <AdvancedMarker
                position={{ lat: homeLocation.lat, lng: homeLocation.lng }}
                zIndex={20}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-500 shadow-lg text-lg">
                  🏠
                </div>
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>
      </div>
    </div>
  )
}
