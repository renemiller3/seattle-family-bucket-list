'use client'

import { useState } from 'react'
import { format } from 'date-fns'

const PRESETS = [
  { label: 'Nap', icon: '😴' },
  { label: 'Meal', icon: '🍽️' },
  { label: 'Break', icon: '🧃' },
  { label: 'Travel', icon: '🚗' },
]

interface LifeBlockPickerProps {
  date: string
  onAdd: (block: { title: string; duration_minutes: number; start_time: string | null }) => void
  onClose: () => void
}

export default function LifeBlockPicker({ date, onAdd, onClose }: LifeBlockPickerProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const activeTitle = showCustom ? customTitle : selected
  const canSave = activeTitle && activeTitle.trim().length > 0

  const handleSave = () => {
    if (!canSave) return

    let durationMinutes = 60 // default
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number)
      const [endH, endM] = endTime.split(':').map(Number)
      const calc = (endH * 60 + endM) - (startH * 60 + startM)
      if (calc > 0) durationMinutes = calc
    }

    onAdd({
      title: activeTitle!.trim(),
      duration_minutes: durationMinutes,
      start_time: startTime || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl my-auto max-h-[calc(100vh-6rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add Block</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Custom activity input */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Activity name</label>
            <input
              type="text"
              placeholder="e.g., Neighborhood park, Coffee stop..."
              value={customTitle}
              onChange={(e) => {
                setCustomTitle(e.target.value)
                setSelected(null)
                setShowCustom(true)
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Quick presets */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Or pick a quick block</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setSelected(preset.label)
                    setShowCustom(false)
                    setCustomTitle('')
                  }}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-sm transition-colors ${
                    selected === preset.label && !showCustom
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{preset.icon}</span>
                  <span className="text-xs font-medium">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
              {format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
            </div>
          </div>

          {/* Start and end time */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
