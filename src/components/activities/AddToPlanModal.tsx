'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import type { Activity, Outing } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface AddToPlanModalProps {
  activity: Activity
  onClose: () => void
  onAdded: () => void
}

export default function AddToPlanModal({ activity, onClose, onAdded }: AddToPlanModalProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('')
  const [notes, setNotes] = useState('')
  const [outingId, setOutingId] = useState('')
  const [outings, setOutings] = useState<Outing[]>([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  // Fetch outings for the current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('outings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at')
        .then(({ data }) => {
          if (data) setOutings(data as Outing[])
        })
    })
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get max sort_order for this date
    const { data: existing } = await supabase
      .from('plan_items')
      .select('sort_order')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

    await supabase.from('plan_items').insert({
      user_id: user.id,
      activity_id: activity.id,
      type: 'activity',
      title: activity.title,
      date,
      start_time: startTime || null,
      duration_minutes: null,
      sort_order: nextOrder,
      notes: notes || null,
      is_completed: false,
      end_time: null,
      travel_time_before: null,
      travel_time_after: null,
      outing_id: outingId || null,
    })

    setSaving(false)
    onAdded()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Add to Plan</h2>
        <p className="mb-4 text-sm text-gray-500">{activity.title}</p>

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

          {outings.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Outing</label>
              <select
                value={outingId}
                onChange={(e) => setOutingId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">None</option>
                {outings.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Start Time <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Confirmation codes, reminders..."
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
            disabled={saving}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add to Plan'}
          </button>
        </div>
      </div>
    </div>
  )
}
