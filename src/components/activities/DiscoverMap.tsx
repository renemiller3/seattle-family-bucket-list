'use client'

import { useState, useMemo, useCallback } from 'react'
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps'
import type { Activity } from '@/lib/types'
import { getVibeEmoji } from '@/lib/utils'
import Link from 'next/link'

interface DiscoverMapProps {
  activities: Activity[]
  selectedActivityId?: string | null
  onSelectActivity?: (activityId: string | null) => void
  className?: string
}

export default function DiscoverMap({ activities, selectedActivityId, onSelectActivity, className }: DiscoverMapProps) {
  const [internalSelected, setInternalSelected] = useState<Activity | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

  const mappable = useMemo(() => {
    return activities.filter((a) => a.lat != null && a.lng != null)
  }, [activities])

  const selectedActivity = useMemo(() => {
    if (selectedActivityId) return mappable.find((a) => a.id === selectedActivityId) || null
    return internalSelected
  }, [selectedActivityId, internalSelected, mappable])

  const handleMarkerClick = useCallback((activity: Activity) => {
    setInternalSelected(activity)
    onSelectActivity?.(activity.id)
  }, [onSelectActivity])

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
          {mappable.map((activity) => {
            const isSelected = selectedActivity?.id === activity.id
            return (
              <AdvancedMarker
                key={activity.id}
                position={{ lat: activity.lat!, lng: activity.lng! }}
                onClick={() => handleMarkerClick(activity)}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-md text-xs transition-transform ${
                  isSelected
                    ? 'border-emerald-600 bg-white scale-125 z-10'
                    : 'border-white bg-emerald-600'
                }`}>
                  {activity.vibes[0] ? (
                    <span className="text-[11px]">{getVibeEmoji(activity.vibes[0])}</span>
                  ) : (
                    <span className={`font-bold text-[10px] ${isSelected ? 'text-emerald-600' : 'text-white'}`}>●</span>
                  )}
                </div>
              </AdvancedMarker>
            )
          })}

          {selectedActivity && selectedActivity.lat && selectedActivity.lng && (
            <InfoWindow
              position={{ lat: selectedActivity.lat, lng: selectedActivity.lng }}
              onCloseClick={handleCloseInfoWindow}
              pixelOffset={[0, -30]}
            >
              <div className="w-[200px] pr-4 -mt-2">
                <p className="font-semibold text-gray-900 text-sm leading-tight">{selectedActivity.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{selectedActivity.area} · {selectedActivity.cost}</p>
                <Link
                  href={`/activities/${selectedActivity.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-xs font-medium text-emerald-600 hover:text-emerald-700"
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
