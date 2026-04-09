'use client'

import { useState, useRef } from 'react'

interface PhotoUploadProps {
  activityId: string
  planItemId?: string
  dateCompleted: string
  onUploaded: () => void
}

export default function PhotoUpload({ activityId, planItemId, dateCompleted, onUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('activity_id', activityId)
      if (planItemId) formData.append('plan_item_id', planItemId)
      formData.append('date_completed', dateCompleted)

      await fetch('/api/upload', { method: 'POST', body: formData })
    }

    setUploading(false)
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
        id="photo-upload"
      />
      <label
        htmlFor="photo-upload"
        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors ${
          uploading ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        {uploading ? 'Uploading...' : 'Add Photos'}
      </label>
    </div>
  )
}
