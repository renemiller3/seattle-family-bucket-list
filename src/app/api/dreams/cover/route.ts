import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const userActivityId = (formData.get('user_activity_id') as string | null) || null

  if (!file) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'bin'
  const folder = userActivityId ?? 'new'
  const path = `${user.id}/dreams/${folder}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(path, file)

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

  if (userActivityId) {
    const { error: updateError } = await supabase
      .from('user_activities')
      .update({ image_url: publicUrl })
      .eq('id', userActivityId)
      .eq('user_id', user.id)
    if (updateError) {
      return NextResponse.json({ error: 'Failed to save cover on dream' }, { status: 500 })
    }
  }

  return NextResponse.json({ url: publicUrl })
}
