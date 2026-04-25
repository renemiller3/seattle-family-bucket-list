'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { type DailyWeather } from '@/lib/weather'
import { generateSlug } from '@/lib/utils'
import {
  buildRecommendationsForUser,
  type RecommendationOption,
  type RecommendationPin,
  type RecommendationResponse,
} from '@/lib/plan-recommendations'

export type {
  RecommendationStep,
  RecommendationOption,
  RecommendationPin,
  RecommendationResult,
  RecommendationResponse,
} from '@/lib/plan-recommendations'

export type CommitResponse =
  | { ok: true; outing_id: string }
  | { ok: false; error: string }

export interface RecommendationPick {
  id: string
  voter_name: string
  option_index: number
  comment: string | null
  created_at: string
}

export interface SharedRecommendationSummary {
  id: string
  slug: string
  date: string
  created_at: string
  expires_at: string
  committed_option_index: number | null
  options: RecommendationOption[]
  weather: DailyWeather | null
  picks: RecommendationPick[]
}

export type CreateShareResponse =
  | { ok: true; slug: string }
  | { ok: false; error: string }

export type PublicShareResponse =
  | {
      ok: true
      expired: boolean
      data: {
        slug: string
        date: string
        owner_name: string
        weather: DailyWeather | null
        options: RecommendationOption[]
        committed_option_index: number | null
        expires_at: string
        picks: RecommendationPick[]
      }
    }
  | { ok: false; error: string }

export type SubmitPickResponse =
  | { ok: true }
  | { ok: false; error: string }

export type ListSharesResponse =
  | { ok: true; data: SharedRecommendationSummary[] }
  | { ok: false; error: string }

function addMinutes(time: string, minutes: number): string {
  const [hStr, mStr] = time.split(':')
  const total = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + minutes
  const h = Math.floor((total % (24 * 60)) / 60)
  const m = total % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export async function generateDayRecommendations(
  date: string,
  pins: RecommendationPin[] = [],
): Promise<RecommendationResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You need to be signed in to use Plan my day.' }
  }
  return buildRecommendationsForUser(user.id, date, pins)
}

export async function commitRecommendation(
  option: RecommendationOption,
  date: string,
  sharedRecommendationId?: string,
  optionIndex?: number
): Promise<CommitResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You need to be signed in to save an outing.' }
  }

  const admin = createAdminClient()

  const { data: outing, error: outingErr } = await admin
    .from('outings')
    .insert({
      user_id: user.id,
      name: option.title,
      lodging_name: null,
      lodging_address: null,
      lodging_lat: null,
      lodging_lng: null,
    })
    .select('*')
    .single()
  if (outingErr || !outing) {
    return { ok: false, error: "Couldn't create the outing. Please try again." }
  }

  type StepRow = {
    user_id: string
    activity_id: string | null
    user_activity_id: string | null
    type: 'activity' | 'life_block' | 'custom' | 'restaurant'
    title: string | null
    date: string
    start_time: string | null
    end_time: string | null
    duration_minutes: number | null
    travel_time_before: number | null
    travel_time_after: number | null
    sort_order: number
    notes: string | null
    is_completed: boolean
    location_url: string | null
    image_url: string | null
    lat: number | null
    lng: number | null
    outing_id: string
  }
  const rows: StepRow[] = []
  let usedAnchor = false

  option.sequence.forEach((step, idx) => {
    const startTime = step.time
    const endTime = step.duration_minutes > 0 ? addMinutes(step.time, step.duration_minutes) : null

    let row: StepRow = {
      user_id: user.id,
      activity_id: null,
      user_activity_id: null,
      type: 'custom',
      title: step.title,
      date,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: step.duration_minutes,
      travel_time_before: null,
      travel_time_after: null,
      sort_order: idx,
      notes: step.notes,
      is_completed: false,
      location_url: null,
      image_url: null,
      lat: null,
      lng: null,
      outing_id: outing.id,
    }

    if (step.step_type === 'activity') {
      if (!usedAnchor) {
        row = { ...row, type: 'activity', activity_id: option.anchor_activity.id, lat: option.anchor_activity.lat, lng: option.anchor_activity.lng, location_url: option.anchor_activity.location_url, image_url: option.anchor_activity.image_url }
        usedAnchor = true
      }
    } else if (step.step_type === 'food') {
      row.type = 'restaurant'
    } else {
      row.type = 'life_block'
    }
    rows.push(row)
  })

  if (!usedAnchor) {
    rows.unshift({
      user_id: user.id,
      activity_id: option.anchor_activity.id,
      user_activity_id: null,
      type: 'activity',
      title: null,
      date,
      start_time: null,
      end_time: null,
      duration_minutes: null,
      travel_time_before: null,
      travel_time_after: null,
      sort_order: 0,
      notes: null,
      is_completed: false,
      location_url: option.anchor_activity.location_url,
      image_url: option.anchor_activity.image_url,
      lat: option.anchor_activity.lat,
      lng: option.anchor_activity.lng,
      outing_id: outing.id,
    })
    rows.forEach((r, i) => { r.sort_order = i })
  }

  const { error: itemsErr } = await admin.from('plan_items').insert(rows)
  if (itemsErr) {
    return { ok: false, error: "The outing was created but we couldn't add the activities to it. Please try again." }
  }

  if (sharedRecommendationId && typeof optionIndex === 'number') {
    await admin
      .from('shared_recommendations')
      .update({ committed_option_index: optionIndex, committed_outing_id: outing.id })
      .eq('id', sharedRecommendationId)
      .eq('user_id', user.id)
  }

  return { ok: true, outing_id: outing.id }
}

// =============================================================================
// Sharing — snapshot of generated recommendations + picks from invitees
// =============================================================================

function expiryFromDate(dateStr: string): string {
  const d = new Date(dateStr + 'T23:59:59')
  d.setDate(d.getDate() + 7)
  return d.toISOString()
}

export async function createSharedRecommendation(
  date: string,
  weather: DailyWeather | null,
  options: RecommendationOption[]
): Promise<CreateShareResponse> {
  if (!Array.isArray(options) || options.length === 0) {
    return { ok: false, error: "Nothing to share — generate options first." }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You need to be signed in to share." }

  const admin = createAdminClient()
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateSlug()
    const { data, error } = await admin
      .from('shared_recommendations')
      .insert({
        user_id: user.id,
        slug,
        date,
        weather,
        options,
        expires_at: expiryFromDate(date),
      })
      .select('slug')
      .single()
    if (data?.slug) return { ok: true, slug: data.slug }
    if (error && !error.message?.includes('duplicate')) {
      return { ok: false, error: "Couldn't create your share link. Please try again." }
    }
  }
  return { ok: false, error: "Couldn't create your share link. Please try again." }
}

export async function getPublicSharedRecommendation(
  slug: string
): Promise<PublicShareResponse> {
  if (!slug || slug.length > 32) {
    return { ok: false, error: "That link doesn't look right." }
  }
  const admin = createAdminClient()
  const { data: share, error } = await admin
    .from('shared_recommendations')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error || !share) {
    return { ok: false, error: "We couldn't find this plan. The link may have been removed." }
  }

  const expired = new Date(share.expires_at).getTime() < Date.now()

  const { data: profile } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', share.user_id)
    .single()

  const { data: picks } = await admin
    .from('recommendation_picks')
    .select('*')
    .eq('shared_recommendation_id', share.id)
    .order('created_at', { ascending: true })

  return {
    ok: true,
    expired,
    data: {
      slug: share.slug,
      date: share.date,
      owner_name: profile?.display_name ?? 'A friend',
      weather: share.weather as DailyWeather | null,
      options: share.options as RecommendationOption[],
      committed_option_index: share.committed_option_index,
      expires_at: share.expires_at,
      picks: (picks ?? []) as RecommendationPick[],
    },
  }
}

export async function submitRecommendationPick(
  slug: string,
  voterName: string,
  optionIndex: number,
  comment: string | null
): Promise<SubmitPickResponse> {
  const trimmedName = (voterName ?? '').trim()
  if (!trimmedName) return { ok: false, error: "Please share your name so they know who voted." }
  if (trimmedName.length > 60) return { ok: false, error: "Name is too long." }
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 2) {
    return { ok: false, error: "Pick one of the three options." }
  }
  const trimmedComment = (comment ?? '').trim()
  if (trimmedComment.length > 500) return { ok: false, error: "Comment is too long." }

  const admin = createAdminClient()
  const { data: share, error: shareErr } = await admin
    .from('shared_recommendations')
    .select('id, expires_at')
    .eq('slug', slug)
    .single()
  if (shareErr || !share) {
    return { ok: false, error: "We couldn't find this plan." }
  }
  if (new Date(share.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "This plan has expired and is no longer accepting votes." }
  }

  const { error: insertErr } = await admin
    .from('recommendation_picks')
    .insert({
      shared_recommendation_id: share.id,
      voter_name: trimmedName,
      option_index: optionIndex,
      comment: trimmedComment || null,
    })
  if (insertErr) {
    return { ok: false, error: "Couldn't save your pick. Please try again." }
  }

  return { ok: true }
}

export async function listMySharedRecommendations(): Promise<ListSharesResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in." }

  const admin = createAdminClient()
  const { data: shares, error } = await admin
    .from('shared_recommendations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) return { ok: false, error: "Couldn't load your shared plans." }

  const ids = (shares ?? []).map((s: { id: string }) => s.id)
  const { data: picks } = ids.length
    ? await admin
        .from('recommendation_picks')
        .select('*')
        .in('shared_recommendation_id', ids)
        .order('created_at', { ascending: true })
    : { data: [] as RecommendationPick[] & { shared_recommendation_id: string }[] }

  const picksByShare = new Map<string, RecommendationPick[]>()
  for (const p of (picks ?? []) as (RecommendationPick & { shared_recommendation_id: string })[]) {
    const list = picksByShare.get(p.shared_recommendation_id) ?? []
    list.push(p)
    picksByShare.set(p.shared_recommendation_id, list)
  }

  const data: SharedRecommendationSummary[] = (shares ?? []).map((s: {
    id: string
    slug: string
    date: string
    created_at: string
    expires_at: string
    committed_option_index: number | null
    options: RecommendationOption[]
    weather: DailyWeather | null
  }) => ({
    id: s.id,
    slug: s.slug,
    date: s.date,
    created_at: s.created_at,
    expires_at: s.expires_at,
    committed_option_index: s.committed_option_index,
    options: s.options,
    weather: s.weather,
    picks: picksByShare.get(s.id) ?? [],
  }))

  return { ok: true, data }
}

export async function deleteSharedRecommendation(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const admin = createAdminClient()
  await admin.from('shared_recommendations').delete().eq('id', id).eq('user_id', user.id)
  return { ok: true }
}

export async function sendShareEmail(
  toEmail: string,
  toName: string,
  shareUrl: string,
  date: string,
  weather: DailyWeather | null,
  options: RecommendationOption[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
  const senderFirst = profile?.display_name?.split(' ')[0] ?? 'Someone'

  const { buildPlanEmail } = await import('@/lib/plan-email')
  const { subject, text, html } = buildPlanEmail({
    date,
    weather,
    options,
    shareUrl,
    variant: { kind: 'share', senderFirst, recipientName: toName },
  })

  const { sendEmail } = await import('@/lib/email')
  const sent = await sendEmail(toEmail, subject, text, html)
  if (!sent) return { ok: false, error: "Couldn't send the email. Copy the link and share it manually." }
  return { ok: true }
}
