'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface PlaceAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect?: (place: { name: string; url: string }) => void
  placeholder?: string
  className?: string
}

export default function PlaceAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'e.g., Neighborhood park, Coffee stop...',
  className = '',
}: PlaceAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [loaded, setLoaded] = useState(false)
  const onPlaceSelectRef = useRef(onPlaceSelect)
  onPlaceSelectRef.current = onPlaceSelect

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey) return

    // If already loaded
    if (window.google?.maps?.places) {
      setLoaded(true)
      return
    }

    // Check if script tag already exists
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const check = setInterval(() => {
        if (window.google?.maps?.places) {
          setLoaded(true)
          clearInterval(check)
        }
      }, 200)
      return () => clearInterval(check)
    }

    // Load the script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = () => setLoaded(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!loaded || !inputRef.current || autocompleteRef.current) return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['name', 'formatted_address', 'url', 'geometry'],
    })

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place) {
        const name = place.name || place.formatted_address || ''
        const url = place.url || `https://maps.google.com/?q=${encodeURIComponent(place.formatted_address || name)}`
        onChange(name)
        onPlaceSelectRef.current?.({ name, url })
      }
    })

    autocompleteRef.current = autocomplete
  }, [loaded, onChange])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className || 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'}
    />
  )
}
