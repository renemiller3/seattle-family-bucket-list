import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const outingId = body.outing_id || null

  // Check if user already has an active shared plan for this outing (or "all")
  let query = supabase
    .from('shared_plans')
    .select('slug')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (outingId) {
    query = query.eq('outing_id', outingId)
  } else {
    query = query.is('outing_id', null)
  }

  const { data: existing } = await query.limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ slug: existing[0].slug })
  }

  // Create new shared plan
  const slug = generateSlug()
  const { data, error } = await supabase
    .from('shared_plans')
    .insert({
      user_id: user.id,
      slug,
      is_active: true,
      title: null,
      outing_id: outingId,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
  }

  return NextResponse.json({ slug: data.slug })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const outingId = body.outing_id

  let query = supabase
    .from('shared_plans')
    .update({ is_active: false })
    .eq('user_id', user.id)

  if (outingId) {
    query = query.eq('outing_id', outingId)
  } else {
    query = query.is('outing_id', null)
  }

  await query

  return NextResponse.json({ ok: true })
}
