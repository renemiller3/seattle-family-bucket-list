'use client'

import { useState } from 'react'
import type { PlanItem } from '@/lib/types'

interface EditItemModalProps {
  item: PlanItem
  onSave: (id: string, updates: Partial<PlanItem>) => void
  onClose: () => void
}

export default function EditItemModal({ item, onSave, onClose }: EditItemModalProps) {
  const [startTime, setStartTime] = useState(item.start_time ?? '')
  const [endTime, setEndTime] = useState(item.end_time ?? '')
  const [durationMinutes, setDurationMinutes] = useState(item.duration_minutes ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [date, setDate] = useState(item.date)

  const title = item.title || item.activity?.title || 'Untitled'

  const handleSave = () => {
    onSave(item.id, {
      start_time: startTime || null,
      end_time: endTime || null,
      duration_minutes: durationMinutes ? Number(durationMinutes) : null,
      notes: notes || null,
      date,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Edit Item</h2>
        <p className="mb-4 text-sm text-gray-500">{title}</p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

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

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Duration <span className="text-gray-400">(minutes)</span>
            </label>
            <input
              type="number"
              min={0}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value ? Number(e.target.value) : '')}
              placeholder="e.g., 90"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

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
