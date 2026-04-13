'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  label: string
}

// Generate time options every 30 minutes from 7:00 AM to 9:00 PM
const TIME_OPTIONS: { value: string; label: string }[] = []
for (let h = 7; h <= 21; h++) {
  for (let m = 0; m < 60; m += 30) {
    const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 || 12
    const displayM = m.toString().padStart(2, '0')
    const label = `${displayH}:${displayM} ${ampm}`
    TIME_OPTIONS.push({ value, label })
  }
}

function formatDisplayValue(value: string): string {
  if (!value) return ''
  const match = TIME_OPTIONS.find((o) => o.value === value)
  if (match) return match.label
  const [h, m] = value.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return value
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`
}

function parseTimeInput(input: string): string | null {
  const cleaned = input.trim().toLowerCase()
  if (!cleaned) return null

  // Try "930", "0930"
  const digitsOnly = cleaned.replace(/[^0-9]/g, '')
  if (/^\d{3,4}$/.test(digitsOnly)) {
    const h = parseInt(digitsOnly.slice(0, -2))
    const m = parseInt(digitsOnly.slice(-2))
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }
  }

  // Try "9:30", "9:30 PM", "9:30pm", "930pm"
  const ampmMatch = cleaned.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i)
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1])
    const m = parseInt(ampmMatch[2] || '0')
    const period = ampmMatch[3]?.toLowerCase()
    if (period === 'pm' && h < 12) h += 12
    if (period === 'am' && h === 12) h = 0
    if (!period && h >= 1 && h <= 6) h += 12 // assume PM for 1-6 without AM/PM
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }
  }

  return null
}

export default function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const [inputText, setInputText] = useState(formatDisplayValue(value))
  const [editing, setEditing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync display when value changes externally
  useEffect(() => {
    if (!editing) {
      setInputText(formatDisplayValue(value))
    }
  }, [value, editing])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setEditing(false)
        // Try to parse what they typed
        if (editing && inputText) {
          const parsed = parseTimeInput(inputText)
          if (parsed) {
            onChange(parsed)
          } else {
            setInputText(formatDisplayValue(value))
          }
        }
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, editing, inputText, value, onChange])

  // Filter options based on input
  const filteredOptions = useMemo(() => {
    if (!inputText || !editing) return TIME_OPTIONS
    const lower = inputText.toLowerCase().replace(/\s/g, '')
    return TIME_OPTIONS.filter((o) => {
      const labelClean = o.label.toLowerCase().replace(/\s/g, '')
      const valueClean = o.value.replace(':', '')
      return labelClean.includes(lower) || valueClean.includes(lower) || o.label.toLowerCase().startsWith(inputText.toLowerCase())
    })
  }, [inputText, editing])

  // Scroll to current value when opening
  useEffect(() => {
    if (open && listRef.current && value) {
      const index = filteredOptions.findIndex((o) => o.value >= value)
      if (index >= 0 && listRef.current.children[index + 1]) {
        (listRef.current.children[index + 1] as HTMLElement).scrollIntoView({ block: 'center' })
      }
    }
  }, [open, value, filteredOptions])

  const handleSelect = (timeValue: string) => {
    onChange(timeValue)
    setInputText(formatDisplayValue(timeValue))
    setOpen(false)
    setEditing(false)
  }

  const handleInputChange = (text: string) => {
    setInputText(text)
    setEditing(true)
    if (!open) setOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const parsed = parseTimeInput(inputText)
      if (parsed) {
        handleSelect(parsed)
      }
      e.preventDefault()
    } else if (e.key === 'Escape') {
      setOpen(false)
      setEditing(false)
      setInputText(formatDisplayValue(value))
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        ref={inputRef}
        type="text"
        value={inputText}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          setOpen(true)
          if (inputText) inputRef.current?.select()
        }}
        onKeyDown={handleKeyDown}
        placeholder="Select or type time"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <button
            onClick={() => handleSelect('')}
            className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
          >
            No time
          </button>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  value === option.value
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-400">
              Press Enter to use "{inputText}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
