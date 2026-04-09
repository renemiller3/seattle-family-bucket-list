'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PlanNotesProps {
  userId: string
}

export default function PlanNotes({ userId }: PlanNotesProps) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [noteId, setNoteId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('plan_notes')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setContent(data.content)
          setNoteId(data.id)
        }
      })
  }, [userId, supabase])

  const save = useCallback(async (text: string) => {
    setSaving(true)
    if (noteId) {
      await supabase.from('plan_notes').update({ content: text }).eq('id', noteId)
    } else {
      const { data } = await supabase
        .from('plan_notes')
        .insert({ user_id: userId, content: text })
        .select()
        .single()
      if (data) setNoteId(data.id)
    }
    setSaving(false)
  }, [noteId, userId, supabase])

  // Auto-save with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content !== undefined) save(content)
    }, 1000)
    return () => clearTimeout(timer)
  }, [content, save])

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Notes & Logistics</h3>
        {saving && <span className="text-xs text-gray-400">Saving...</span>}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Confirmation codes, hotel info, reminders..."
        rows={4}
        className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
    </div>
  )
}
