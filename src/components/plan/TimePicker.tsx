'use client'

import { useState, useRef, useEffect } from 'react'

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  label: string
}

// Generate time options every 15 minutes from 6:00 AM to 10:00 PM
const TIME_OPTIONS: { value: string; label: string }[] = []
for (let h = 6; h <= 22; h++) {
  for (let m = 0; m < 60; m += 15) {
    const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 || 12
    const displayM = m.toString().padStart(2, '0')
    const label = `${displayH}:${displayM} ${ampm}`
    TIME_OPTIONS.push({ value, label })
  }
}

export default function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Format display value
  const displayValue = value
    ? TIME_OPTIONS.find((o) => o.value === value)?.label ||
      (() => {
        const [h, m] = value.split(':').map(Number)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const displayH = h % 12 || 12
        return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`
      })()
    : ''

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Scroll to current value when opening
  useEffect(() => {
    if (open && listRef.current && value) {
      const index = TIME_OPTIONS.findIndex((o) => o.value >= value)
      if (index >= 0) {
        const el = listRef.current.children[index] as HTMLElement
        if (el) el.scrollIntoView({ block: 'center' })
      }
    }
  }, [open, value])

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-left text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        {displayValue || <span className="text-gray-400">Select time</span>}
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {/* Clear option */}
          <button
            onClick={() => {
              onChange('')
              setOpen(false)
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
          >
            No time
          </button>
          {TIME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                value === option.value
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
