'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchDailyWeather, type DailyWeather } from '@/lib/weather'
import { distanceMiles, seasonFromDate } from '@/lib/geo'
import type { Activity, AgeRange } from '@/lib/types'

const GEMINI_MODEL = 'gemini-2.5-flash'
const MAX_CANDIDATES = 40
const MAX_DISTANCE_MILES = 75
const VIBES = ['Chill / Easy', 'Burn Energy', 'Special / Treat'] as const

type StepType = 'activity' | 'food' | 'other'

export interface RecommendationStep {
  time: string
  step_type: StepType
  title: string
  duration_minutes: number
  notes: string | null
}

export interface RecommendationOption {
  vibe_label: string
  title: string
  pitch: string
  anchor_activity_id: string
  secondary_activity_id: string | null
  food_stop: { name: string; vicinity: string; why: string } | null
  sequence: RecommendationStep[]
  cost_band: 'Free' | '$' | '$$' | '$$$'
  total_drive_time_minutes: number
  why_today: string
  // Hydrated server-side:
  anchor_activity: Activity
  secondary_activity: Activity | null
}

export interface RecommendationResult {
  date: string
  weather: DailyWeather | null
  options: RecommendationOption[]
}

export type RecommendationResponse =
  | { ok: true; data: RecommendationResult }
  | { ok: false; error: string }

export type CommitResponse =
  | { ok: true; outing_id: string }
  | { ok: false; error: string }

function ageRangeFits(range: AgeRange, kidAge: number): boolean {
  switch (range) {
    case 'All Ages': return true
    case 'Toddler': return kidAge >= 1 && kidAge <= 3
    case '3-5': return kidAge >= 3 && kidAge <= 5
    case '5+': return kidAge >= 5
    case '8+': return kidAge >= 8
    case '12+': return kidAge >= 12
  }
}

function activityFitsAllKids(ranges: AgeRange[], kidAges: number[]): boolean {
  if (kidAges.length === 0) return true
  return kidAges.every((age) => ranges.some((r) => ageRangeFits(r, age)))
}

interface CompactActivity {
  id: string
  title: string
  area: string
  cost: string
  vibes: string[]
  age_range: string[]
  crowd_level: string | null
  why: string
  nearby_food: { name: string; description: string }[]
  location_text: string
  distance_miles: number | null
}

function toCompact(a: Activity, homeLat: number | null, homeLng: number | null): CompactActivity {
  const distance =
    homeLat != null && homeLng != null && a.lat != null && a.lng != null
      ? Math.round(distanceMiles(homeLat, homeLng, a.lat, a.lng))
      : null
  return {
    id: a.id,
    title: a.title,
    area: a.area,
    cost: a.cost,
    vibes: a.vibes,
    age_range: a.age_range,
    crowd_level: a.crowd_level,
    why: a.why_its_worth_it,
    nearby_food: a.nearby_food ?? [],
    location_text: a.location_text,
    distance_miles: distance,
  }
}

function formatTime12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function buildPrompt(args: {
  date: string
  weather: DailyWeather | null
  season: string
  kidsAges: number[]
  homeAddress: string | null
  napStartTime: string | null
  napEndTime: string | null
  candidates: CompactActivity[]
}): string {
  const { date, weather, season, kidsAges, homeAddress, napStartTime, napEndTime, candidates } = args
  const weatherLine = weather
    ? `Weather: ${weather.conditions}, high ${weather.temp_high_f}°F / low ${weather.temp_low_f}°F, ${weather.precipitation_chance}% chance of precipitation. ${weather.is_wet ? 'Lean indoor or covered.' : ''}`
    : `Weather: forecast not available; rely on the season (${season}).`
  const familyLine = kidsAges.length > 0
    ? `Kids' ages: ${kidsAges.join(', ')}. All picks must work for every kid.`
    : `Family ages unspecified.`
  const homeLine = homeAddress ? `Home base: ${homeAddress}.` : `Home base unknown.`
  const napLine = napStartTime && napEndTime
    ? `NAP WINDOW: ${formatTime12h(napStartTime)}–${formatTime12h(napEndTime)}. Do NOT schedule activities during this window. Plan to be home or wrapping up by ${formatTime12h(napStartTime)}, then resume (if relevant) after ${formatTime12h(napEndTime)}.`
    : ''

  return `You are a Seattle family-outing concierge. Plan ONE outing for each of three vibes — "Chill / Easy", "Burn Energy", and "Special / Treat" — for the date below.

Date: ${date} (${season})
${weatherLine}
${familyLine}
${homeLine}
${napLine}

You MUST select anchor and secondary activities by id from the candidate list below. Do not invent activities that aren't on the list. The "food_stop" field is the one place you may suggest a real restaurant by name (use the activity's nearby_food hints when available, otherwise pick something plausible near the anchor's location_text).

Each option needs:
- "vibe_label": exactly one of "Chill / Easy", "Burn Energy", "Special / Treat" (one per vibe, no duplicates)
- "title": short evocative title (e.g. "Soggy Saturday: aquarium + ramen + bookstore wander")
- "pitch": one-sentence pitch
- "anchor_activity_id": the main draw (id from list)
- "secondary_activity_id": optional second stop nearby (id from list, or null)
- "food_stop": { name, vicinity, why } or null if not appropriate
- "sequence": ordered timed steps. Use HH:MM 24-hour times. step_type ∈ {"activity","food","other"}. Reference the anchor by exact title in title field.
- "cost_band": "Free" | "$" | "$$" | "$$$"
- "total_drive_time_minutes": rough estimate of driving across the day
- "why_today": one sentence explicitly referencing weather or season

Aim for 3–5 sequence steps total. Keep timing realistic (drive buffers, kid stamina). Default to a late-morning start (~9:30–10:30) unless the activity has a known constraint.

CANDIDATES (json):
${JSON.stringify(candidates)}
`
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          vibe_label: { type: 'string', enum: ['Chill / Easy', 'Burn Energy', 'Special / Treat'] },
          title: { type: 'string' },
          pitch: { type: 'string' },
          anchor_activity_id: { type: 'string' },
          secondary_activity_id: { type: 'string', nullable: true },
          food_stop: {
            type: 'object',
            nullable: true,
            properties: {
              name: { type: 'string' },
              vicinity: { type: 'string' },
              why: { type: 'string' },
            },
            required: ['name', 'vicinity', 'why'],
          },
          sequence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                time: { type: 'string' },
                step_type: { type: 'string', enum: ['activity', 'food', 'other'] },
                title: { type: 'string' },
                duration_minutes: { type: 'integer' },
                notes: { type: 'string', nullable: true },
              },
              required: ['time', 'step_type', 'title', 'duration_minutes'],
            },
          },
          cost_band: { type: 'string', enum: ['Free', '$', '$$', '$$$'] },
          total_drive_time_minutes: { type: 'integer' },
          why_today: { type: 'string' },
        },
        required: [
          'vibe_label', 'title', 'pitch', 'anchor_activity_id',
          'sequence', 'cost_band', 'total_drive_time_minutes', 'why_today',
        ],
      },
    },
  },
  required: ['options'],
}

interface GeminiOption {
  vibe_label: string
  title: string
  pitch: string
  anchor_activity_id: string
  secondary_activity_id?: string | null
  food_stop?: { name: string; vicinity: string; why: string } | null
  sequence: RecommendationStep[]
  cost_band: 'Free' | '$' | '$$' | '$$$'
  total_drive_time_minutes: number
  why_today: string
}

type GeminiCallResult =
  | { ok: true; data: { options: GeminiOption[] } }
  | { ok: false; error: string }

async function callGemini(prompt: string, apiKey: string): Promise<GeminiCallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.8,
        },
      }),
      cache: 'no-store',
    })
  } catch {
    return { ok: false, error: "Couldn't reach Google's AI service. Check your internet connection and try again." }
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, error: "Google rejected the AI key. Ask the site admin to check the GEMINI_API_KEY setting." }
  }
  if (res.status === 429) {
    return { ok: false, error: "We've hit Google's rate limit for AI requests. Please try again in a minute." }
  }
  if (!res.ok) {
    return { ok: false, error: `Google's AI service returned an error (${res.status}). Please try again.` }
  }
  let json: unknown
  try {
    json = await res.json()
  } catch {
    return { ok: false, error: "Got an unreadable response from the AI. Please try again." }
  }
  const text = (json as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    return { ok: false, error: "The AI didn't return a plan this time. Please try again." }
  }
  try {
    return { ok: true, data: JSON.parse(text) }
  } catch {
    return { ok: false, error: "The AI returned a response we couldn't read. Please try again." }
  }
}

export async function generateDayRecommendations(date: string): Promise<RecommendationResponse> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: 'Please pick a valid date.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You need to be signed in to use Plan my day.' }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      error: "Plan my day isn't set up yet. Ask the site admin to add a GEMINI_API_KEY.",
    }
  }

  const admin = createAdminClient()
  const [profileRes, activitiesRes, completedRes] = await Promise.all([
    admin.from('profiles').select('*').eq('id', user.id).single(),
    admin.from('activities').select('*'),
    admin
      .from('plan_items')
      .select('activity_id')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .not('activity_id', 'is', null),
  ])
  if (profileRes.error || activitiesRes.error) {
    return { ok: false, error: "Couldn't load your profile or the activity list. Please try again." }
  }
  const profile = profileRes.data
  const allActivities = (activitiesRes.data ?? []) as Activity[]
  const completedActivityIds = new Set(
    ((completedRes.data ?? []) as { activity_id: string }[]).map((r) => r.activity_id)
  )

  const season = seasonFromDate(date)
  const homeLat = profile?.home_lat ?? null
  const homeLng = profile?.home_lng ?? null
  const kidsAges: number[] = profile?.kids_ages ?? []

  const candidates = allActivities.filter((a) => {
    if (completedActivityIds.has(a.id)) return false
    if (a.seasons && a.seasons.length > 0 && !a.seasons.includes(season)) return false
    if (a.start_date && date < a.start_date) return false
    if (a.end_date && date > a.end_date) return false
    if (homeLat != null && homeLng != null && a.lat != null && a.lng != null) {
      const d = distanceMiles(homeLat, homeLng, a.lat, a.lng)
      if (d > MAX_DISTANCE_MILES) return false
    }
    if (!activityFitsAllKids(a.age_range, kidsAges)) return false
    return true
  })

  if (candidates.length < 3) {
    return {
      ok: false,
      error:
        "Not enough activities match this day. Try a different date, or check your home address and kids' ages in settings.",
    }
  }

  // Cap candidates by distance proximity (when home is set) to keep prompt tight.
  const ranked = [...candidates]
  if (homeLat != null && homeLng != null) {
    ranked.sort((a, b) => {
      const da = a.lat != null && a.lng != null ? distanceMiles(homeLat, homeLng, a.lat, a.lng) : 999
      const db = b.lat != null && b.lng != null ? distanceMiles(homeLat, homeLng, b.lat, b.lng) : 999
      return da - db
    })
  }
  const limited = ranked.slice(0, MAX_CANDIDATES)
  const compact = limited.map((a) => toCompact(a, homeLat, homeLng))

  const weather = homeLat != null && homeLng != null
    ? await fetchDailyWeather(homeLat, homeLng, date)
    : null

  const prompt = buildPrompt({
    date,
    weather,
    season,
    kidsAges,
    homeAddress: profile?.home_address ?? null,
    napStartTime: profile?.nap_start_time ?? null,
    napEndTime: profile?.nap_end_time ?? null,
    candidates: compact,
  })

  const geminiResult = await callGemini(prompt, apiKey)
  if (!geminiResult.ok) return geminiResult

  // Validate and hydrate.
  const byId = new Map(allActivities.map((a) => [a.id, a]))
  const seenVibes = new Set<string>()
  const hydrated: RecommendationOption[] = []
  for (const opt of geminiResult.data.options ?? []) {
    if (!VIBES.includes(opt.vibe_label as typeof VIBES[number])) continue
    if (seenVibes.has(opt.vibe_label)) continue
    const anchor = byId.get(opt.anchor_activity_id)
    if (!anchor) continue
    const secondary = opt.secondary_activity_id ? byId.get(opt.secondary_activity_id) ?? null : null
    seenVibes.add(opt.vibe_label)
    hydrated.push({
      vibe_label: opt.vibe_label,
      title: opt.title,
      pitch: opt.pitch,
      anchor_activity_id: opt.anchor_activity_id,
      secondary_activity_id: opt.secondary_activity_id ?? null,
      food_stop: opt.food_stop ?? null,
      sequence: opt.sequence,
      cost_band: opt.cost_band,
      total_drive_time_minutes: opt.total_drive_time_minutes,
      why_today: opt.why_today,
      anchor_activity: anchor,
      secondary_activity: secondary,
    })
  }

  hydrated.sort(
    (a, b) => VIBES.indexOf(a.vibe_label as typeof VIBES[number]) - VIBES.indexOf(b.vibe_label as typeof VIBES[number])
  )

  if (hydrated.length === 0) {
    return { ok: false, error: "The AI couldn't put together a plan for that day. Please try again." }
  }

  return { ok: true, data: { date, weather, options: hydrated } }
}

function addMinutes(time: string, minutes: number): string {
  const [hStr, mStr] = time.split(':')
  const total = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + minutes
  const h = Math.floor((total % (24 * 60)) / 60)
  const m = total % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export async function commitRecommendation(
  option: RecommendationOption,
  date: string
): Promise<CommitResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You need to be signed in to save an outing.' }
  }

  const admin = createAdminClient()

  // Create the outing.
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

  // Build plan items from the sequence.
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
  let usedSecondary = false

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
      // Match to anchor or secondary by title (best-effort), prefer the anchor first.
      if (!usedAnchor && step.title.toLowerCase().includes(option.anchor_activity.title.toLowerCase().split(' ')[0])) {
        row = { ...row, type: 'activity', activity_id: option.anchor_activity.id, lat: option.anchor_activity.lat, lng: option.anchor_activity.lng, location_url: option.anchor_activity.location_url, image_url: option.anchor_activity.image_url }
        usedAnchor = true
      } else if (!usedSecondary && option.secondary_activity && step.title.toLowerCase().includes(option.secondary_activity.title.toLowerCase().split(' ')[0])) {
        row = { ...row, type: 'activity', activity_id: option.secondary_activity.id, lat: option.secondary_activity.lat, lng: option.secondary_activity.lng, location_url: option.secondary_activity.location_url, image_url: option.secondary_activity.image_url }
        usedSecondary = true
      } else if (!usedAnchor) {
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

  // Defensive: ensure the anchor made it in even if Gemini's titles drifted.
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

  return { ok: true, outing_id: outing.id }
}
