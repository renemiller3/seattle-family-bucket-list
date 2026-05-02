import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not read upload'
    return NextResponse.json({ error: `Could not read upload: ${msg}` }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const activityId = (formData.get('activity_id') as string | null) || null
  const userActivityId = (formData.get('user_activity_id') as string | null) || null
  const planItemId = (formData.get('plan_item_id') as string | null) || null
  const dateCompleted = formData.get('date_completed') as string

  if (!file || !dateCompleted || (!activityId && !userActivityId)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (activityId && userActivityId) {
    return NextResponse.json({ error: 'Specify either activity_id or user_activity_id, not both' }, { status: 400 })
  }

  const ext = pickExtension(file)
  const contentType = file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
  const targetId = activityId ?? userActivityId
  const path = `${user.id}/${targetId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(path, file, { contentType, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

  const { data, error } = await supabase.from('activity_photos').insert({
    user_id: user.id,
    activity_id: activityId,
    user_activity_id: userActivityId,
    plan_item_id: planItemId,
    photo_url: publicUrl,
    date_completed: dateCompleted,
  }).select().single()

  if (error) {
    return NextResponse.json({ error: `Failed to save photo: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json(data)
}
