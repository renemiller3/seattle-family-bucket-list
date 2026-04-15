'use client'

import { useState, useMemo, useCallback } from 'react'
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps'
import type { Activity } from '@/lib/types'
import { getVibeEmoji } from '@/lib/utils'
import Link from 'next/link'

interface HomeLocation {
  lat: number
  lng: number
  address: string
}

interface DriveInfo {
  distanceText: string
  durationText: string
}

interface DiscoverMapProps {
  activities: Activity[]
  homeLocation?: HomeLocation | null
  selectedActivityId?: string | null
  onSelectActivity?: (activityId: string | null) => void
  className?: string
}

export default function DiscoverMap({
  activities,
  homeLocation,
  selectedActivityId,
  onSelectActivity,
  className,
}: DiscoverMapProps) {
  const [internalSelected, setInternalSelected] = useState<Activity | null>(null)
  const [driveCache, setDriveCache] = useState<Record<string, DriveInfo>>({})
  const [loadingDrive, setLoadingDrive] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

  const mappable = useMemo(() => {
    return activities.filter((a) => a.lat != null && a.lng != null)
  }, [activities])

  const selectedActivity = useMemo(() => {
    if (selectedActivityId) return mappable.find((a) => a.id === selectedActivityId) || null
    return internalSelected
  }, [selectedActivityId, internalSelected, mappable])

  const fetchDrive = useCallback(
    async (activity: Activity) => {
      if (!homeLocation || !activity.lat || !activity.lng) return
      if (driveCache[activity.id]) return
      setLoadingDrive(true)
      try {
        const res = await fetch('/api/distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originLat: homeLocation.lat,
            originLng: homeLocation.lng,
            destLat: activity.lat,
            destLng: activity.lng,
          }),
        })
        const data = await res.json()
        if (data.durationText) {
          setDriveCache((prev) => ({ ...prev, [activity.id]: data }))
        }
      } finally {
        setLoadingDrive(false)
      }
    },
    [homeLocation, driveCache]
  )

  const handleMarkerClick = useCallback(
    (activity: Activity) => {
      setInternalSelected(activity)
      onSelectActivity?.(activity.id)
      fetchDrive(activity)
    },
    [onSelectActivity, fetchDrive]
  )

  const handleCloseInfoWindow = useCallback(() => {
    setInternalSelected(null)
    onSelectActivity?.(null)
  }, [onSelectActivity])

  const center = useMemo(() => {
    if (mappable.length === 0) return { lat: 47.6062, lng: -122.3321 }
    const lats = mappable.map((a) => a.lat!)
    const lngs = mappable.map((a) => a.lng!)
    return {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
    }
  }, [mappable])

  if (!apiKey || mappable.length === 0) return null

  const currentDrive = selectedActivity ? driveCache[selectedActivity.id] : null

  return (
    <div className={className || 'h-[300px] w-full overflow-hidden rounded-xl border border-gray-200'}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={9}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="discover-map"
        >
          {/* Activity markers */}
          {mappable.map((activity) => {
            const isSelected = selectedActivity?.id === activity.id
            return (
              <AdvancedMarker
                key={activity.id}
                position={{ lat: activity.lat!, lng: activity.lng! }}
                onClick={() => handleMarkerClick(activity)}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-md text-xs transition-transform ${
                    isSelected
                      ? 'border-emerald-600 bg-white scale-125 z-10'
                      : 'border-white bg-emerald-600'
                  }`}
                >
                  {activity.vibes[0] ? (
                    <span className="text-[11px]">{getVibeEmoji(activity.vibes[0])}</span>
                  ) : (
                    <span className={`font-bold text-[10px] ${isSelected ? 'text-emerald-600' : 'text-white'}`}>
                      ●
                    </span>
                  )}
                </div>
              </AdvancedMarker>
            )
          })}

          {/* Home pin */}
          {homeLocation && (
            <AdvancedMarker
              position={{ lat: homeLocation.lat, lng: homeLocation.lng }}
              zIndex={20}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-500 shadow-lg text-lg">
                🏠
              </div>
            </AdvancedMarker>
          )}

          {/* InfoWindow */}
          {selectedActivity && selectedActivity.lat && selectedActivity.lng && (
            <InfoWindow
              position={{ lat: selectedActivity.lat, lng: selectedActivity.lng }}
              onCloseClick={handleCloseInfoWindow}
              pixelOffset={[0, -30]}
            >
              <div style={{ width: 210, paddingRight: 16, marginTop: -4, fontFamily: 'system-ui, sans-serif' }}>
                <p style={{ fontWeight: 600, color: '#111827', fontSize: 14, lineHeight: 1.3, margin: 0 }}>
                  {selectedActivity.title}
                </p>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 0 }}>
                  {selectedActivity.area} · {selectedActivity.cost}
                </p>
                {homeLocation && (
                  <p style={{ fontSize: 12, color: '#2563eb', marginTop: 4, marginBottom: 0 }}>
                    {currentDrive
                      ? `🚗 ${currentDrive.durationText} · ${currentDrive.distanceText}`
                      : loadingDrive
                      ? 'Calculating drive time…'
                      : ''}
                  </p>
                )}
                <Link
                  href={`/activities/${selectedActivity.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#059669',
                    textDecoration: 'none',
                  }}
                >
                  View details →
                </Link>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  )
}
