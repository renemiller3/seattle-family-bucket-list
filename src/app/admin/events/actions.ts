'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'
import type { AgeRange, Area, Cost, Vibe } from '@/lib/types'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user)) throw new Error('Forbidden')
  return user!
}

function revalidate() {
  revalidatePath('/admin/events')
  revalidatePath('/events')
  revalidatePath('/')
}

// Build an Activity row from a queue item's AI-enriched data.
function buildActivity(item: {
  ai_title: string | null
  raw_title: string
  ai_description: string | null
  raw_description: string | null
  ai_location_text: string | null
  raw_location: string | null
  ai_age_ranges: string[]
  ai_cost: string | null
  ai_vibes: string[]
  ai_area: string | null
  raw_start_at: string
  raw_end_at: string | null
  raw_image_url: string | null
  source_url: string | null
}) {
  const startDate = item.raw_start_at.slice(0, 10)
  const endDate = item.raw_end_at ? item.raw_end_at.slice(0, 10) : startDate
  const title = item.ai_title || item.raw_title
  const description = item.ai_description || item.raw_description || ''
  const locationText = item.ai_location_text || item.raw_location || 'Seattle, WA'
  const ageRanges = (item.ai_age_ranges ?? []) as AgeRange[]
  const cost = (item.ai_cost ?? 'Free') as Cost
  const vibes = (item.ai_vibes ?? []) as Vibe[]
  const area = (item.ai_area ?? 'Seattle') as Area

  return {
    title,
    description,
    location_text: locationText,
    location_url: item.source_url ?? '',
    lat: null,
    lng: null,
    type: 'event' as const,
    age_range: ageRanges.length > 0 ? ageRanges : (['All Ages'] as AgeRange[]),
    area,
    cost,
    vibes: vibes.length > 0 ? vibes : (['Special / Treat'] as Vibe[]),
    pregnancy_friendly: [] as string[],
    crowd_level: null,
    why_its_worth_it: description,
    what_to_watch_out_for: [] as string[],
    tips: null,
    nearby_food: [] as { name: string; description: string }[],
    start_date: startDate,
    end_date: endDate,
    recurrence: 'one-time' as const,
    image_url: item.raw_image_url ?? null,
    video_url: null,
    website_url: item.source_url ?? null,
    featured: false,
    seasons: [] as string[],
  }
}

export async function approveEvent(queueId: string): Promise<void> {
  const user = await assertAdmin()
  const admin = createAdminClient()

  const { data: item } = await admin
    .from('event_queue')
    .select('*')
    .eq('id', queueId)
    .single()

  if (!item) throw new Error('Event not found')

  const activityPayload = buildActivity(item)
  const { data: activity, error } = await admin
    .from('activities')
    .insert(activityPayload)
    .select('id')
    .single()

  if (error || !activity) throw new Error(error?.message ?? 'Failed to create activity')

  await admin.from('event_queue').update({
    review_status: 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
    activity_id: activity.id,
    updated_at: new Date().toISOString(),
  }).eq('id', queueId)

  revalidate()
}

export async function rejectEvent(queueId: string, reason?: string): Promise<void> {
  const user = await assertAdmin()
  const admin = createAdminClient()

  await admin.from('event_queue').update({
    review_status: 'rejected',
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
    rejection_reason: reason ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', queueId)

  revalidate()
}

export async function approveAllHighConfidence(): Promise<{ approved: number }> {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: items } = await admin
    .from('event_queue')
    .select('*')
    .eq('review_status', 'pending')
    .eq('ai_is_family_friendly', true)
    .gte('ai_confidence', 0.75)
    .order('raw_start_at')

  if (!items || items.length === 0) return { approved: 0 }

  let approved = 0
  for (const item of items) {
    try {
      await approveEvent(item.id)
      approved++
    } catch {
      // continue — don't let one failure block the rest
    }
  }

  return { approved }
}
