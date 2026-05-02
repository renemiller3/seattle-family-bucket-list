'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PhotoUploadProps {
  activityId?: string
  userActivityId?: string
  planItemId?: string
  dateCompleted: string
  onUploaded: () => void
  compact?: boolean
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/pjpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/avif': 'avif',
}

function pickExtension(file: File): string {
  const fromMime = MIME_TO_EXT[file.type?.toLowerCase() ?? '']
  if (fromMime) return fromMime
  const name = file.name ?? ''
  const dot = name.lastIndexOf('.')
  if (dot > 0 && dot < name.length - 1) {
    const ext = name.slice(dot + 1).toLowerCase()
    if (/^[a-z0-9]{1,5}$/.test(ext)) return ext
  }
  return 'jpg'
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
  const supabase = createClient()

  const uploadOne = async (file: File): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'

    const ext = pickExtension(file)
    const contentType = file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
    const targetId = activityId ?? userActivityId
    const path = `${user.id}/${targetId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(path, file, { contentType, upsert: false })
    if (uploadError) return uploadError.message

    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

    const { error: insertError } = await supabase.from('activity_photos').insert({
      user_id: user.id,
      activity_id: activityId ?? null,
      user_activity_id: userActivityId ?? null,
      plan_item_id: planItemId ?? null,
      photo_url: publicUrl,
      date_completed: dateCompleted,
    })
    if (insertError) return insertError.message

    return null
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)
    const failures: string[] = []

    for (const file of Array.from(files)) {
      const err = await uploadOne(file)
      if (err) failures.push(err)
    }

    setUploading(false)
    if (failures.length > 0) {
      setError(
        failures.length === files.length
          ? `Upload failed: ${failures[0]}`
          : `${failures.length} of ${files.length} photos failed: ${failures[0]}`,
      )
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
