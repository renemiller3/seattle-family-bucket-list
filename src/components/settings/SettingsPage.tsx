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

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, updateHomeAddress, clearHomeAddress } = useProfile(user?.id)

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
    </div>
  )
}
