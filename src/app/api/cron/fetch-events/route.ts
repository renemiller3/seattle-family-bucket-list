import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllSources } from '@/lib/event-sources'
import { enrichEvents } from '@/lib/event-enrichment'
import type { RawEvent } from '@/lib/event-sources/types'
import type { AgeRange, Area, Cost, Vibe } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Build an Activity insert payload from an approved queue item (for auto-approve path).
function buildActivityInsert(
  raw: RawEvent,
  enriched: {
    title: string
    description: string
    ageRanges: AgeRange[]
    cost: Cost
    vibes: Vibe[]
    area: Area
    locationText: string
  },
) {
  const startDate = raw.startAt.toISOString().slice(0, 10)
  const endDate = raw.endAt ? raw.endAt.toISOString().slice(0, 10) : startDate

  // Format time hint for tips field
  const timeHint = formatTimeHint(raw.startAt, raw.endAt)

  return {
    title: enriched.title,
    description: enriched.description,
    location_text: enriched.locationText,
    location_url: raw.sourceUrl,
    lat: null,
    lng: null,
    type: 'event' as const,
    age_range: enriched.ageRanges.length > 0 ? enriched.ageRanges : (['All Ages'] as AgeRange[]),
    area: enriched.area,
    cost: enriched.cost,
    vibes: enriched.vibes.length > 0 ? enriched.vibes : (['Special / Treat'] as Vibe[]),
    pregnancy_friendly: [] as string[],
    crowd_level: null,
    why_its_worth_it: enriched.description,
    what_to_watch_out_for: [] as string[],
    tips: timeHint,
    nearby_food: [] as { name: string; description: string }[],
    start_date: startDate,
    end_date: endDate,
    recurrence: 'one-time' as const,
    image_url: raw.imageUrl ?? null,
    video_url: null,
    website_url: raw.sourceUrl,
    featured: false,
    seasons: [] as string[],
  }
}

function formatTimeHint(start: Date, end: Date | null): string | null {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }
  const startStr = start.toLocaleTimeString('en-US', options)
  if (!end) return `Starts ${startStr}.`
  const endStr = end.toLocaleTimeString('en-US', options)
  return `${startStr} – ${endStr}.`
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const stats = {
    sourceFetched: 0,
    alreadyKnown: 0,
    newInserted: 0,
    autoApproved: 0,
    enrichmentErrors: [] as string[],
    sourceErrors: [] as { source: string; error: string }[],
  }

  // 1. Fetch raw events from all sources
  const { events: rawEvents, sourceErrors } = await fetchAllSources()
  stats.sourceFetched = rawEvents.length
  stats.sourceErrors = sourceErrors

  if (rawEvents.length === 0) {
    return NextResponse.json({ ok: true, stats })
  }

  // 2. Dedup against existing event_queue rows (by source_type + source_id)
  const sourceIdPairs = rawEvents.map((e) => `${e.sourceType}|${e.sourceId}`)
  const { data: existingRows } = await admin
    .from('event_queue')
    .select('source_type, source_id')
    .in('source_type', [...new Set(rawEvents.map((e) => e.sourceType))])

  const existingKeys = new Set(
    (existingRows ?? []).map((r: { source_type: string; source_id: string }) => `${r.source_type}|${r.source_id}`)
  )
  const newEvents = rawEvents.filter((e) => !existingKeys.has(`${e.sourceType}|${e.sourceId}`))
  stats.alreadyKnown = rawEvents.length - newEvents.length

  if (newEvents.length === 0) {
    return NextResponse.json({ ok: true, stats })
  }

  // 3. Enrich new events via Gemini
  const { results: enrichedMap, errors: enrichErrors } = await enrichEvents(newEvents)
  stats.enrichmentErrors = enrichErrors

  // 4. Insert into event_queue; auto-approve high-confidence events from trusted sources
  for (const raw of newEvents) {
    const enriched = enrichedMap.get(raw.sourceId)

    // If enrichment failed for this event, insert as pending with no AI data
    const baseInsert = {
      raw_title: raw.title,
      raw_description: raw.description || null,
      raw_location: raw.location ?? null,
      raw_start_at: raw.startAt.toISOString(),
      raw_end_at: raw.endAt?.toISOString() ?? null,
      raw_image_url: raw.imageUrl ?? null,
      raw_cost_text: raw.costText ?? null,
      source_type: raw.sourceType,
      source_id: raw.sourceId,
      source_url: raw.sourceUrl,
    }

    if (!enriched || !enriched.isFamilyFriendly) {
      // Skip non-family-friendly events entirely (don't clutter the queue)
      if (enriched && !enriched.isFamilyFriendly) continue

      // Unenriched: insert as pending
      await admin.from('event_queue').insert({
        ...baseInsert,
        review_status: 'pending',
      })
      stats.newInserted++
      continue
    }

    if (enriched.shouldAutoApprove) {
      // Create the activity directly and mark as auto_approved
      const activityPayload = buildActivityInsert(raw, {
        title: enriched.title,
        description: enriched.description,
        ageRanges: enriched.ageRanges,
        cost: enriched.cost,
        vibes: enriched.vibes,
        area: enriched.area,
        locationText: enriched.locationText,
      })

      const { data: activity } = await admin
        .from('activities')
        .insert(activityPayload)
        .select('id')
        .single()

      await admin.from('event_queue').insert({
        ...baseInsert,
        ai_title: enriched.title,
        ai_description: enriched.description,
        ai_age_ranges: enriched.ageRanges,
        ai_cost: enriched.cost,
        ai_vibes: enriched.vibes,
        ai_area: enriched.area,
        ai_location_text: enriched.locationText,
        ai_is_family_friendly: true,
        ai_confidence: enriched.confidence,
        ai_reasoning: enriched.reasoning,
        ai_enriched_at: new Date().toISOString(),
        review_status: 'auto_approved',
        reviewed_at: new Date().toISOString(),
        activity_id: activity?.id ?? null,
      })

      stats.newInserted++
      stats.autoApproved++
    } else {
      // Family-friendly but below auto-approve threshold: queue for admin review
      await admin.from('event_queue').insert({
        ...baseInsert,
        ai_title: enriched.title,
        ai_description: enriched.description,
        ai_age_ranges: enriched.ageRanges,
        ai_cost: enriched.cost,
        ai_vibes: enriched.vibes,
        ai_area: enriched.area,
        ai_location_text: enriched.locationText,
        ai_is_family_friendly: true,
        ai_confidence: enriched.confidence,
        ai_reasoning: enriched.reasoning,
        ai_enriched_at: new Date().toISOString(),
        review_status: 'pending',
      })
      stats.newInserted++
    }
  }

  return NextResponse.json({ ok: true, stats })
}
