// Server-only core for Plan-my-day generation. The user-facing server action
// (src/app/plan/actions.ts) delegates here after auth, and the weekly-email
// cron job calls this directly with a known user_id.

import 'server-only'
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
  coffee_stop: { name: string; vicinity: string; why: string } | null
  sequence: RecommendationStep[]
  cost_band: 'Free' | '$' | '$$' | '$$$'
  total_drive_time_minutes: number
  why_today: string
  anchor_activity: Activity
  secondary_activity: Activity | null
}

export type RecommendationPin =
  | { kind: 'activity'; activity_id: string }
  | { kind: 'idea'; text: string }

export interface RecommendationResult {
  date: string
  weather: DailyWeather | null
  options: RecommendationOption[]
}

export type RecommendationResponse =
  | { ok: true; data: RecommendationResult }
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
  pinnedActivities: Activity[]
  ideaPins: string[]
}): string {
  const { date, weather, season, kidsAges, homeAddress, napStartTime, napEndTime, candidates, pinnedActivities, ideaPins } = args
  const weatherLine = weather
    ? `Weather: ${weather.conditions}, high ${weather.temp_high_f}°F / low ${weather.temp_low_f}°F, ${weather.precipitation_chance}% chance of precipitation. ${weather.is_wet ? 'Lean indoor or covered.' : ''}`
    : `Weather: forecast not available; rely on the season (${season}).`
  const familyLine = kidsAges.length > 0
    ? `Kids' ages: ${kidsAges.join(', ')}. All picks must work for every kid.`
    : `Family ages unspecified.`
  const homeLine = homeAddress ? `Home base: ${homeAddress}.` : `Home base unknown.`
  const napLine = napStartTime && napEndTime
    ? `NAP WINDOW: ${formatTime12h(napStartTime)}–${formatTime12h(napEndTime)}. Do NOT schedule activities during this window. The family MUST be back home BEFORE ${formatTime12h(napStartTime)} — account for drive time so the last out-of-home step ends with enough buffer to be home by then. Resume (if relevant) after ${formatTime12h(napEndTime)}.`
    : ''

  const pinLines: string[] = []
  if (pinnedActivities.length > 0) {
    pinLines.push('USER PINS (you MUST honor these):')
    for (const a of pinnedActivities) {
      pinLines.push(
        `- Anchor pin: the user explicitly wants to do "${a.title}" (id: ${a.id}). Make it the anchor_activity_id of ONE of the three options. Vibes for this activity: ${a.vibes.join(', ')}. Pick the vibe_label for that option that best matches one of the three target vibes (Chill / Easy, Burn Energy, Special / Treat).`
      )
    }
  }
  if (ideaPins.length > 0) {
    if (pinLines.length === 0) pinLines.push('USER PINS (you MUST honor these):')
    for (const text of ideaPins) {
      pinLines.push(
        `- Idea pin: the user also wants to include "${text}". Weave this into the sequence of ONE of the three options as a "food" or "other" step at a reasonable time. Do NOT use it as the anchor_activity_id. The user's idea text should appear verbatim in that step's title.`
      )
    }
  }
  if (pinLines.length > 0) {
    pinLines.push('Remaining option(s) (if any) are yours to design freely. Each option must still cover a distinct vibe — no duplicates.')
  }

  return `You are a Seattle family-outing concierge. Plan ONE outing for each of three vibes — "Chill / Easy", "Burn Energy", and "Special / Treat" — for the date below.

Date: ${date} (${season})
${weatherLine}
${familyLine}
${homeLine}
${napLine}

You MUST select anchor and secondary activities by id from the candidate list below. Do not invent activities that aren't on the list. The "food_stop" and "coffee_stop" fields are the only places you may suggest a real business by name — use the activity's nearby_food hints when available, otherwise pick something plausible near the anchor's location_text.

Each option needs:
- "vibe_label": exactly one of "Chill / Easy", "Burn Energy", "Special / Treat" (one per vibe, no duplicates)
- "title": short evocative title (e.g. "Soggy Saturday: aquarium + ramen + bookstore wander")
- "pitch": one-sentence pitch
- "anchor_activity_id": the main draw (id from list)
- "secondary_activity_id": optional second stop nearby (id from list, or null)
- "coffee_stop": { name, vicinity, why } — REQUIRED. A cool, well-loved coffee shop on the morning drive route from home toward the anchor activity. Prefer local independent shops with character over chains. The "why" should be one short sentence on what makes it worth the stop.
- "food_stop": { name, vicinity, why } or null if not appropriate
- "sequence": ordered timed steps. Use HH:MM 24-hour times. step_type ∈ {"activity","food","other"}. Reference the anchor by exact title in title field. Include the coffee stop as a step with step_type "food" before the anchor.
- "cost_band": "Free" | "$" | "$$" | "$$$"
- "total_drive_time_minutes": rough estimate of driving across the day
- "why_today": one sentence explicitly referencing weather or season

Aim for 3–5 sequence steps total (the coffee stop counts as one). Keep timing realistic (drive buffers, kid stamina). Default to a late-morning start (~9:30–10:30) unless the activity has a known constraint.

${pinLines.join('\n')}

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
          coffee_stop: {
            type: 'object',
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
          'vibe_label', 'title', 'pitch', 'anchor_activity_id', 'coffee_stop',
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
  coffee_stop?: { name: string; vicinity: string; why: string } | null
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
    return { ok: false, error: "We couldn't connect to generate your plan. Check your internet and try again." }
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, error: "There's a configuration issue on our end. Please contact support." }
  }
  if (res.status === 429) {
    return { ok: false, error: "Too many requests right now — please wait a minute and try again." }
  }
  if (!res.ok) {
    return { ok: false, error: "Something went wrong. Please try again in a moment." }
  }
  let json: unknown
  try {
    json = await res.json()
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." }
  }
  const text = (json as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    return { ok: false, error: "We couldn't put together a plan this time. Please try again." }
  }
  try {
    return { ok: true, data: JSON.parse(text) }
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}

export async function buildRecommendationsForUser(
  userId: string,
  date: string,
  pins: RecommendationPin[] = [],
): Promise<RecommendationResponse> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: 'Please pick a valid date.' }
  }
  if (pins.length > 2) {
    return { ok: false, error: 'You can pin up to 2 things per day.' }
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
    admin.from('profiles').select('*').eq('id', userId).single(),
    admin.from('activities').select('*'),
    admin
      .from('plan_items')
      .select('activity_id')
      .eq('user_id', userId)
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

  const ranked = [...candidates]
  if (homeLat != null && homeLng != null) {
    ranked.sort((a, b) => {
      const da = a.lat != null && a.lng != null ? distanceMiles(homeLat, homeLng, a.lat, a.lng) : 999
      const db = b.lat != null && b.lng != null ? distanceMiles(homeLat, homeLng, b.lat, b.lng) : 999
      return da - db
    })
  }
  const limited = ranked.slice(0, MAX_CANDIDATES)

  const allById = new Map(allActivities.map((a) => [a.id, a]))
  const pinnedActivities: Activity[] = []
  const ideaPins: string[] = []
  for (const pin of pins) {
    if (pin.kind === 'activity') {
      const a = allById.get(pin.activity_id)
      if (a) pinnedActivities.push(a)
    } else if (pin.kind === 'idea') {
      const text = pin.text.trim()
      if (text) ideaPins.push(text)
    }
  }
  const finalCandidates = [...limited]
  for (const a of pinnedActivities) {
    if (!finalCandidates.some((c) => c.id === a.id)) finalCandidates.unshift(a)
  }
  const compact = finalCandidates.map((a) => toCompact(a, homeLat, homeLng))

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
    pinnedActivities,
    ideaPins,
  })

  const geminiResult = await callGemini(prompt, apiKey)
  if (!geminiResult.ok) return geminiResult

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
      coffee_stop: opt.coffee_stop ?? null,
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
