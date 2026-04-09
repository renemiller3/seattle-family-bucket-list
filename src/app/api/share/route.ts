import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user already has an active shared plan
  const { data: existing } = await supabase
    .from('shared_plans')
    .select('slug')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)

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
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
  }

  return NextResponse.json({ slug: data.slug })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await supabase
    .from('shared_plans')
    .update({ is_active: false })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
