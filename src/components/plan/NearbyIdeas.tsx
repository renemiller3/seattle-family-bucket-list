'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import type { Activity, Outing, PlanItem } from '@/lib/types'
import { distanceMiles, seasonFromDate } from '@/lib/geo'

interface Props {
  outing: Outing
  outingItems: PlanItem[]
  allActivities: Activity[]
  bucketListIds: Set<string>
  onAdd: (activity: Activity, date: string) => void | Promise<void>
}

export default function NearbyIdeas({
  outing,
  outingItems,
  allActivities,
  bucketListIds,
  onAdd,
}: Props) {
  const anchor = useMemo(() => {
    if (outing.lodging_lat != null && outing.lodging_lng != null) {
      return { lat: outing.lodging_lat, lng: outing.lodging_lng, source: 'lodging' as const }
    }
    const coords = outingItems
      .map((it) => {
        const lat = it.activity?.lat ?? it.lat
        const lng = it.activity?.lng ?? it.lng
        return lat != null && lng != null ? { lat, lng } : null
      })
      .filter((c): c is { lat: number; lng: number } => c != null)
    if (coords.length === 0) return null
    return {
      lat: coords.reduce((s, c) => s + c.lat, 0) / coords.length,
      lng: coords.reduce((s, c) => s + c.lng, 0) / coords.length,
      source: 'centroid' as const,
    }
  }, [outing, outingItems])

  const radius = useMemo(() => {
    if (!anchor) return 15
    const distances = outingItems
      .map((it) => {
        const lat = it.activity?.lat ?? it.lat
        const lng = it.activity?.lng ?? it.lng
        if (lat == null || lng == null) return null
        return distanceMiles(anchor.lat, anchor.lng, lat, lng)
      })
      .filter((d): d is number => d != null)
    const max = distances.length ? Math.max(...distances) : 0
    return Math.min(75, Math.max(15, max * 1.5))
  }, [anchor, outingItems])

  const outingSeasons = useMemo(() => {
    const seasons = new Set<string>()
    for (const it of outingItems) seasons.add(seasonFromDate(it.date))
    return seasons
  }, [outingItems])

  const existingActivityIds = useMemo(() => {
    const ids = new Set<string>()
    for (const it of outingItems) if (it.activity_id) ids.add(it.activity_id)
    return ids
  }, [outingItems])

  const candidates = useMemo(() => {
    if (!anchor) return []
    return allActivities
      .filter((a) => a.lat != null && a.lng != null)
      .filter((a) => !existingActivityIds.has(a.id))
      .filter((a) => {
        if (!a.seasons || a.seasons.length === 0) return true
        if (outingSeasons.size === 0) return true
        return a.seasons.some((s) => outingSeasons.has(s))
      })
      .map((a) => ({
        activity: a,
        distance: distanceMiles(anchor.lat, anchor.lng, a.lat!, a.lng!),
      }))
      .filter((c) => c.distance <= radius)
      .sort((a, b) => {
        const aB = bucketListIds.has(a.activity.id) ? 0 : 1
        const bB = bucketListIds.has(b.activity.id) ? 0 : 1
        if (aB !== bB) return aB - bB
        if (a.activity.featured !== b.activity.featured) return a.activity.featured ? -1 : 1
        return a.distance - b.distance
      })
      .slice(0, 10)
  }, [anchor, radius, allActivities, existingActivityIds, outingSeasons, bucketListIds])

  const outingDates = useMemo(() => {
    return [...new Set(outingItems.map((i) => i.date))].sort()
  }, [outingItems])

  if (!anchor || candidates.length === 0) return null

  const anchorLabel =
    anchor.source === 'lodging' && outing.lodging_name
      ? outing.lodging_name
      : 'your outing'

  return (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Nearby Ideas</h2>
        <p className="text-sm text-gray-500">
          Activities within {Math.round(radius)} mi of {anchorLabel}
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
        {candidates.map(({ activity, distance }) => (
          <SuggestionCard
            key={activity.id}
            activity={activity}
            distance={distance}
            isBucketListed={bucketListIds.has(activity.id)}
            outingDates={outingDates}
            onAdd={(date) => onAdd(activity, date)}
          />
        ))}
      </div>
    </section>
  )
}

interface CardProps {
  activity: Activity
  distance: number
  isBucketListed: boolean
  outingDates: string[]
  onAdd: (date: string) => void | Promise<void>
}

function SuggestionCard({ activity, distance, isBucketListed, outingDates, onAdd }: CardProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customDate, setCustomDate] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    function handleClick(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
        setShowCustomInput(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  const handlePick = async (date: string) => {
    await onAdd(date)
    setPickerOpen(false)
    setShowCustomInput(false)
    setCustomDate('')
  }

  return (
    <div
      ref={cardRef}
      className="relative flex w-[220px] shrink-0 snap-start flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <Link
        href={`/activities/${activity.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="relative h-32 w-full overflow-hidden bg-gray-100">
          {activity.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activity.image_url}
              alt={activity.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl text-gray-300">
              🌲
            </div>
          )}
          {isBucketListed && (
            <span className="absolute top-2 left-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              ★ Bucket list
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <Link
          href={`/activities/${activity.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-emerald-700"
        >
          {activity.title}
        </Link>
        <p className="mt-1 text-xs text-gray-500">{distance.toFixed(1)} mi away</p>
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="mt-3 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
        >
          + Add to outing
        </button>
      </div>

      {pickerOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {outingDates.length > 0 && (
            <>
              <div className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Add to…
              </div>
              {outingDates.map((d) => (
                <button
                  key={d}
                  onClick={() => handlePick(d)}
                  className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                >
                  {format(parseISO(d), 'EEE, MMM d')}
                </button>
              ))}
              <div className="my-1 border-t border-gray-100" />
            </>
          )}
          {showCustomInput ? (
            <div className="px-3 py-2">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
              <div className="mt-1.5 flex gap-2">
                <button
                  onClick={() => customDate && handlePick(customDate)}
                  disabled={!customDate}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-40"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowCustomInput(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomInput(true)}
              className="block w-full px-3 py-2 text-left text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Pick a date…
            </button>
          )}
        </div>
      )}
    </div>
  )
}
