'use client'

import { useState } from 'react'
import { format } from 'date-fns'

const PRESETS = [
  { label: 'Nap', icon: '😴', duration: 90 },
  { label: 'Meal', icon: '🍽️', duration: 60 },
  { label: 'Break', icon: '🧃', duration: 30 },
  { label: 'Travel', icon: '🚗', duration: 30 },
]

interface LifeBlockPickerProps {
  date: string
  onAdd: (block: { title: string; duration_minutes: number; start_time: string | null }) => void
  onClose: () => void
}

export default function LifeBlockPicker({ date, onAdd, onClose }: LifeBlockPickerProps) {
  const [customTitle, setCustomTitle] = useState('')
  const [customDuration, setCustomDuration] = useState(30)
  const [startTime, setStartTime] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Add Life Block</h3>
        <p className="mb-4 text-sm text-gray-500">
          {format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d')}
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Start Time <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onAdd({ title: preset.label, duration_minutes: preset.duration, start_time: startTime || null })}
              className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg">{preset.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{preset.label}</p>
                <p className="text-xs text-gray-500">{preset.duration} min</p>
              </div>
            </button>
          ))}
        </div>

        {showCustom ? (
          <div className="space-y-3 border-t border-gray-200 pt-4">
            <input
              type="text"
              placeholder="Block name"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={480}
                value={customDuration}
                onChange={(e) => setCustomDuration(Number(e.target.value))}
                className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <span className="text-sm text-gray-500">minutes</span>
            </div>
            <button
              onClick={() => {
                if (customTitle.trim()) {
                  onAdd({ title: customTitle.trim(), duration_minutes: customDuration, start_time: startTime || null })
                }
              }}
              disabled={!customTitle.trim()}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Add Custom Block
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCustom(true)}
            className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
          >
            + Custom Block
          </button>
        )}

        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
