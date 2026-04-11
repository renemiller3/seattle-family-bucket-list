'use client'

import { useState } from 'react'
import type { PlanItem } from '@/lib/types'

interface EditItemModalProps {
  item: PlanItem
  onSave: (id: string, updates: Partial<PlanItem>) => void
  onClose: () => void
}

const LIFE_BLOCK_OPTIONS = [
  { label: 'Nap', icon: '😴' },
  { label: 'Meal', icon: '🍽️' },
  { label: 'Break', icon: '☕' },
  { label: 'Travel', icon: '🚗' },
]

export default function EditItemModal({ item, onSave, onClose }: EditItemModalProps) {
  const [startTime, setStartTime] = useState(item.start_time ?? '')
  const [endTime, setEndTime] = useState(item.end_time ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [date, setDate] = useState(item.date)
  const [title, setTitle] = useState(item.title || item.activity?.title || '')

  const isLifeBlock = item.type === 'life_block'
  const isCustom = item.type === 'custom'
  const displayTitle = title || item.activity?.title || 'Untitled'

  const handleSave = () => {
    // Calculate duration from start and end times
    let durationMinutes: number | null = null
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number)
      const [endH, endM] = endTime.split(':').map(Number)
      durationMinutes = (endH * 60 + endM) - (startH * 60 + startM)
      if (durationMinutes < 0) durationMinutes = null
    }

    onSave(item.id, {
      start_time: startTime || null,
      end_time: endTime || null,
      duration_minutes: durationMinutes,
      notes: notes || null,
      date,
      ...(isLifeBlock || isCustom ? { title } : {}),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Edit Item</h2>

        <div className="space-y-4">
          {/* Activity type / title */}
          {isLifeBlock ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Type</label>
              <div className="grid grid-cols-4 gap-2">
                {LIFE_BLOCK_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setTitle(opt.label)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-sm transition-colors ${
                      title === opt.label
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : isCustom ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
              <p className="text-sm font-medium text-gray-900">{displayTitle}</p>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Start and end time */}
          <div className="grid grid-cols-2 gap-3">
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

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reminders, confirmation codes..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
