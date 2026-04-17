'use client'

import { useEffect, useRef, useState } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import type { UserActivity } from '@/lib/types'

export interface DreamFormInput {
  title: string
  location_text: string | null
  lat: number | null
  lng: number | null
  emoji: string | null
  notes: string | null
  image_url: string | null
}

interface AddDreamModalProps {
  onClose: () => void
  // Called with the final form values. For create flows the dream is created
  // first with a null image_url; the modal then uploads the chosen file (if
  // any) and reports back the URL via onSubmit's second argument so the
  // caller can persist it.
  onSubmit: (input: DreamFormInput) => Promise<void>
  initial?: UserActivity | null
  mode?: 'create' | 'edit'
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

async function uploadDreamCover(file: File, userActivityId: string | null): Promise<string | null> {
  const formData = new FormData()
  formData.append('file', file)
  if (userActivityId) formData.append('user_activity_id', userActivityId)
  const res = await fetch('/api/dreams/cover', { method: 'POST', body: formData })
  if (!res.ok) return null
  const json = await res.json()
  return (json.url as string) ?? null
}

export default function AddDreamModal({ onClose, onSubmit, initial, mode = 'create' }: AddDreamModalProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [locationText, setLocationText] = useState(initial?.location_text ?? '')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial?.lat != null && initial?.lng != null ? { lat: initial.lat, lng: initial.lng } : null
  )
  const [emoji, setEmoji] = useState<string>(initial?.emoji ?? '🗺️')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.image_url ?? null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    }
  }, [pendingPreview])

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(file)
    setPendingPreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
    setImageUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    setSaving(true)

    let finalImageUrl: string | null = imageUrl
    if (pendingFile) {
      setUploading(true)
      const uploaded = await uploadDreamCover(pendingFile, mode === 'edit' ? initial?.id ?? null : null)
      setUploading(false)
      if (uploaded) finalImageUrl = uploaded
    }

    await onSubmit({
      title: trimmed,
      location_text: locationText.trim() ? locationText.trim() : null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      emoji,
      notes: notes.trim() ? notes.trim() : null,
      image_url: finalImageUrl,
    })
    setSaving(false)
  }

  const previewSrc = pendingPreview ?? imageUrl
  const isEdit = mode === 'edit'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
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
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Dream' : 'Add a Dream'}</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {isEdit ? 'Update the details of your dream.' : 'What do you want to do someday?'}
          </p>
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

          {/* Photo / GIF */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Photo or GIF <span className="font-normal normal-case text-gray-400">(optional)</span>
            </label>
            {previewSrc ? (
              <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                <img src={previewSrc} alt="" className="aspect-[5/2] w-full object-cover" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
                  aria-label="Remove photo"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label
                htmlFor="dream-image-input"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 hover:border-amber-400 hover:bg-amber-50 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Add a photo or GIF
              </label>
            )}
            <input
              ref={fileInputRef}
              id="dream-image-input"
              type="file"
              accept="image/*,image/gif"
              onChange={handleFilePick}
              className="hidden"
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
              {uploading ? 'Uploading…' : saving ? (isEdit ? 'Saving…' : 'Adding…') : isEdit ? 'Save Changes' : 'Add to Bucket List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
