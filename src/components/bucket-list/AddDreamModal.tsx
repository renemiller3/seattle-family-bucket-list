'use client'

import { useEffect, useRef, useState } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'

interface AddDreamModalProps {
  onClose: () => void
  onSubmit: (input: {
    title: string
    location_text: string | null
    lat: number | null
    lng: number | null
    emoji: string | null
    notes: string | null
  }) => Promise<void>
}

const EMOJI_OPTIONS = ['🗺️', '🏔️', '⛵', '🎢', '✨', '🏖️', '🍜', '🎨']

function LocationInput({
  value,
  onChange,
  onPlaceSelected,
}: {
  value: string
  onChange: (v: string) => void
  onPlaceSelected: (place: { address: string; lat: number; lng: number }) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!inputRef.current || typeof google === 'undefined') return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry', 'name'],
    })

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place.geometry?.location) {
        const address = place.name
          ? `${place.name}${place.formatted_address ? ` — ${place.formatted_address}` : ''}`
          : place.formatted_address ?? ''
        onPlaceSelected({
          address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        })
      }
    })

    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [onPlaceSelected])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Somewhere special…"
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    />
  )
}

export default function AddDreamModal({ onClose, onSubmit }: AddDreamModalProps) {
  const [title, setTitle] = useState('')
  const [locationText, setLocationText] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [emoji, setEmoji] = useState<string>('🗺️')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    setSaving(true)
    await onSubmit({
      title: trimmed,
      location_text: locationText.trim() ? locationText.trim() : null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      emoji,
      notes: notes.trim() ? notes.trim() : null,
    })
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-5">
          <div className="mb-1 text-2xl">✨</div>
          <h2 className="text-lg font-bold text-gray-900">Add a Dream</h2>
          <p className="mt-0.5 text-sm text-gray-500">What do you want to do someday?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Disney World with the kids"
              autoFocus
              maxLength={120}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Location <span className="font-normal normal-case text-gray-400">(optional)</span>
            </label>
            {apiKey ? (
              <APIProvider apiKey={apiKey} libraries={['places']}>
                <LocationInput
                  value={locationText}
                  onChange={(v) => {
                    setLocationText(v)
                    setCoords(null)
                  }}
                  onPlaceSelected={(p) => {
                    setLocationText(p.address)
                    setCoords({ lat: p.lat, lng: p.lng })
                  }}
                />
              </APIProvider>
            ) : (
              <input
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="Somewhere special…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            )}
          </div>

          {/* Emoji */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Icon
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`h-10 w-10 rounded-lg text-xl transition-all ${
                    emoji === e
                      ? 'bg-amber-100 ring-2 ring-amber-300'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Notes <span className="font-normal normal-case text-gray-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember — when to go, who to take…"
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Adding…' : 'Add to Bucket List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
