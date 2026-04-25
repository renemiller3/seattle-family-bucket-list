'use client'

import { useEffect, useRef, useState } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import Link from 'next/link'

// Inner component — must be rendered inside APIProvider so google.maps is available
function HomeAddressInput({
  currentAddress,
  onSave,
  onClear,
}: {
  currentAddress: string | null
  onSave: (address: string, lat: number, lng: number) => Promise<void>
  onClear: () => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState(currentAddress ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<{ address: string; lat: number; lng: number } | null>(null)

  // Sync if currentAddress changes externally (e.g. after clear)
  useEffect(() => {
    setInputValue(currentAddress ?? '')
    setSelectedPlace(null)
  }, [currentAddress])

  useEffect(() => {
    if (!inputRef.current || typeof google === 'undefined') return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
    })

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place.geometry?.location && place.formatted_address) {
        setSelectedPlace({
          address: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        })
        setInputValue(place.formatted_address)
      }
    })

    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [])

  const handleSave = async () => {
    if (!selectedPlace) return
    setSaving(true)
    await onSave(selectedPlace.address, selectedPlace.lat, selectedPlace.lng)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSelectedPlace(null)
  }

  const handleClear = async () => {
    setSaving(true)
    await onClear()
    setSaving(false)
    setInputValue('')
    setSelectedPlace(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setSelectedPlace(null)
          }}
          placeholder="Start typing your address…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        {selectedPlace && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </button>
        )}
      </div>
      {currentAddress && !selectedPlace && (
        <button
          onClick={handleClear}
          disabled={saving}
          className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
        >
          Remove home address
        </button>
      )}
      <p className="text-xs text-gray-400">
        Used to show drive time to activities on the map and activity pages. Stored only in your account.
      </p>
    </div>
  )
}

function KidsAgesInput({
  currentAges,
  onSave,
}: {
  currentAges: number[] | null
  onSave: (ages: number[]) => Promise<void>
}) {
  const canonical = (currentAges ?? []).join(', ')
  const [value, setValue] = useState(canonical)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => parseInt(s, 10))

  const isValid = parsed.every((n) => Number.isInteger(n) && n >= 0 && n <= 18)
  const dirty = value.trim() !== canonical.trim()

  const handleSave = async () => {
    if (!isValid) {
      setError('Use whole numbers 0–18, separated by commas.')
      return
    }
    setError(null)
    setSaving(true)
    await onSave(parsed)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          placeholder="e.g. 3, 6"
          inputMode="numeric"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving || !isValid}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-gray-400">
        Helps us suggest outings that work for your whole crew. Leave blank to see everything.
      </p>
    </div>
  )
}

function NapTimeInput({
  currentStart,
  currentEnd,
  onSave,
}: {
  currentStart: string | null
  currentEnd: string | null
  onSave: (start: string | null, end: string | null) => Promise<void>
}) {
  const [start, setStart] = useState(currentStart ?? '')
  const [end, setEnd] = useState(currentEnd ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const canonical = `${currentStart ?? ''}|${currentEnd ?? ''}`
  const current = `${start}|${end}`
  const dirty = current !== canonical

  const handleSave = async () => {
    setSaving(true)
    await onSave(start || null, end || null)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = async () => {
    setSaving(true)
    await onSave(null, null)
    setStart('')
    setEnd('')
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <span className="text-sm text-gray-500">to</span>
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </button>
        )}
      </div>
      {(currentStart || currentEnd) && !dirty && (
        <button
          onClick={handleClear}
          disabled={saving}
          className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
        >
          Remove nap time
        </button>
      )}
      <p className="text-xs text-gray-400">
        We&rsquo;ll schedule outings around this window so you&rsquo;re not rushing back.
      </p>
    </div>
  )
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, updateHomeAddress, clearHomeAddress, updateKidsAges, updateNapTime } = useProfile(user?.id)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

  if (authLoading || profileLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 rounded bg-gray-200" />
          <div className="h-24 rounded-xl bg-gray-200" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mb-6 text-gray-600">Sign in to manage your settings.</p>
        <Link href="/" className="text-emerald-600 hover:text-emerald-700 underline">
          Go home
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Settings</h1>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">🏠 Home Address</h2>
        <p className="mb-4 text-sm text-gray-500">
          Your home address is shown as a pin on the map and used to calculate drive time to activities.
        </p>

        {apiKey ? (
          <APIProvider apiKey={apiKey} libraries={['places']}>
            <HomeAddressInput
              currentAddress={profile?.home_address ?? null}
              onSave={updateHomeAddress}
              onClear={clearHomeAddress}
            />
          </APIProvider>
        ) : (
          <p className="text-sm text-red-500">Google Maps API key not configured.</p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">👧 Kids&rsquo; Ages</h2>
        <p className="mb-4 text-sm text-gray-500">
          How old are your kids? Enter their ages separated by commas.
        </p>
        <KidsAgesInput
          currentAges={profile?.kids_ages ?? null}
          onSave={updateKidsAges}
        />
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">😴 Nap Time</h2>
        <p className="mb-4 text-sm text-gray-500">
          If your little one still naps, set the window and we&rsquo;ll plan around it.
        </p>
        <NapTimeInput
          currentStart={profile?.nap_start_time ?? null}
          currentEnd={profile?.nap_end_time ?? null}
          onSave={updateNapTime}
        />
      </section>
    </div>
  )
}
