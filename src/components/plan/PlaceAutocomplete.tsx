'use client'

import { useEffect, useRef, useState } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'

interface PlaceAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect?: (place: { name: string; url: string }) => void
  placeholder?: string
  className?: string
}

function PlaceInput({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  className,
}: PlaceAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const onPlaceSelectRef = useRef(onPlaceSelect)
  onPlaceSelectRef.current = onPlaceSelect

  useEffect(() => {
    if (!inputRef.current || autocompleteRef.current) return
    if (!window.google?.maps?.places) return

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
  }, [onChange])

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

export default function PlaceAutocomplete(props: PlaceAutocompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

  if (!apiKey) {
    return (
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className={props.className || 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'}
      />
    )
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places']}>
      <PlaceInput {...props} />
    </APIProvider>
  )
}
