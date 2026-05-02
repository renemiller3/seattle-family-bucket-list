'use client'

import { useState, useRef } from 'react'

interface PhotoUploadProps {
  activityId?: string
  userActivityId?: string
  planItemId?: string
  dateCompleted: string
  onUploaded: () => void
  compact?: boolean
}

export default function PhotoUpload({
  activityId,
  userActivityId,
  planItemId,
  dateCompleted,
  onUploaded,
  compact,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = `photo-upload-${activityId ?? userActivityId ?? 'unknown'}`

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)
    const failures: string[] = []

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      if (activityId) formData.append('activity_id', activityId)
      if (userActivityId) formData.append('user_activity_id', userActivityId)
      if (planItemId) formData.append('plan_item_id', planItemId)
      formData.append('date_completed', dateCompleted)

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (!res.ok) {
          let msg = `${res.status} ${res.statusText}`.trim()
          try {
            const body = await res.json()
            if (body?.error) msg = body.error
          } catch {}
          failures.push(msg)
        }
      } catch (err) {
        failures.push(err instanceof Error ? err.message : 'Network error')
      }
    }

    setUploading(false)
    if (failures.length > 0) {
      const summary =
        failures.length === files.length
          ? `Upload failed: ${failures[0]}`
          : `${failures.length} of ${files.length} photos failed: ${failures[0]}`
      setError(summary)
    }
    onUploaded()
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        className="hidden"
        id={inputId}
      />
      {compact ? (
        <label
          htmlFor={inputId}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors ${
            uploading ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          {uploading ? 'Uploading…' : 'Add photos'}
        </label>
      ) : (
        <label
          htmlFor={inputId}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors ${
            uploading ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          {uploading ? 'Uploading…' : 'Add Photos'}
        </label>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
