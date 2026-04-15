'use client'

import { useState } from 'react'
import type { PlanItem, Outing } from '@/lib/types'
import TimePicker from './TimePicker'
import PlaceAutocomplete from './PlaceAutocomplete'
import ImageSearch from './ImageSearch'

interface EditItemModalProps {
  item: PlanItem
  onSave: (id: string, updates: Partial<PlanItem>) => void
  onClose: () => void
  outings?: Outing[]
}

const LIFE_BLOCK_OPTIONS = [
  { label: 'Nap', icon: '😴' },
  { label: 'Meal', icon: '🍽️' },
  { label: 'Break', icon: '🧃' },
  { label: 'Travel', icon: '🚗' },
]

export default function EditItemModal({ item, onSave, onClose, outings = [] }: EditItemModalProps) {
  const [startTime, setStartTime] = useState(item.start_time ?? '')
  const [endTime, setEndTime] = useState(item.end_time ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [date, setDate] = useState(item.date)
  const [title, setTitle] = useState(item.title || item.activity?.title || '')
  const [outingId, setOutingId] = useState(item.outing_id ?? '')
  const [locationUrl, setLocationUrl] = useState(item.location_url ?? '')
  const [lat, setLat] = useState<number | null>(item.lat ?? null)
  const [lng, setLng] = useState<number | null>(item.lng ?? null)
  const [imageUrl, setImageUrl] = useState<string | null>(item.image_url ?? null)
  const [showImageSearch, setShowImageSearch] = useState(false)

  const isLifeBlock = item.type === 'life_block'
  const isCustom = item.type === 'custom'
  const displayTitle = title || item.activity?.title || 'Untitled'

  const handleSave = () => {
    // Calculate duration from start and end times
    let durationMinutes: number | null = null
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number)
      const [endH, endM] = endTime.split(':').map(Number)
      durationMinutes = (endH * 60 + endM) - (startH * 60 + startM)
      if (durationMinutes < 0) durationMinutes = null
    }

    const hasLocation = !!locationUrl.trim()
    onSave(item.id, {
      start_time: startTime || null,
      end_time: endTime || null,
      duration_minutes: durationMinutes,
      notes: notes || null,
      date,
      outing_id: outingId || null,
      location_url: locationUrl.trim() || null,
      lat: hasLocation ? lat : null,
      lng: hasLocation ? lng : null,
      image_url: imageUrl,
      ...(isLifeBlock || isCustom ? { title } : {}),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl my-auto max-h-[calc(100vh-6rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Edit Item</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Activity type / title */}
          {isLifeBlock ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Activity name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <label className="mt-3 mb-2 block text-sm font-medium text-gray-700">Or pick a quick block</label>
              <div className="grid grid-cols-4 gap-2">
                {LIFE_BLOCK_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setTitle(opt.label)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-sm transition-colors ${
                      title === opt.label
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : isCustom ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
              <p className="text-sm font-medium text-gray-900">{displayTitle}</p>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Outing */}
          {outings.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Outing</label>
              <select
                value={outingId}
                onChange={(e) => setOutingId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">None</option>
                {outings.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Start and end time */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TimePicker label="Start Time" value={startTime} onChange={setStartTime} />
            <TimePicker label="End Time" value={endTime} onChange={setEndTime} />
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Location <span className="text-gray-400">(optional)</span>
            </label>
            <PlaceAutocomplete
              value={locationUrl}
              onChange={(val) => {
                setLocationUrl(val)
                if (!val.trim()) {
                  setLat(null)
                  setLng(null)
                }
              }}
              onPlaceSelect={(place) => {
                setLocationUrl(place.url)
                setLat(place.lat)
                setLng(place.lng)
                setImageUrl(place.imageUrl)
              }}
              placeholder="Search a place or paste a Google Maps link"
            />
          </div>

          {/* Image */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Image <span className="text-gray-400">(optional)</span>
            </label>
            {imageUrl ? (
              <div className="relative">
                <div className="h-24 w-full overflow-hidden rounded-lg bg-gray-100">
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <button
                  onClick={() => setImageUrl(null)}
                  className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowImageSearch(true)}
                className="w-full rounded-lg border border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
              >
                Find an image
              </button>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reminders, confirmation codes..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Save
          </button>
        </div>
      </div>

      {showImageSearch && (
        <ImageSearch
          onSelect={(url) => {
            setImageUrl(url)
            setShowImageSearch(false)
          }}
          onClose={() => setShowImageSearch(false)}
        />
      )}
    </div>
  )
}
