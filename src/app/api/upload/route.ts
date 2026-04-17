import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
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

  const ext = file.name.split('.').pop()
  const targetId = activityId ?? userActivityId
  const path = `${user.id}/${targetId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(path, file)

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
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
    return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
  }

  return NextResponse.json(data)
}
