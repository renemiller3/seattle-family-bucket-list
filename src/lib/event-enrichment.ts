import 'server-only'
import type { RawEvent } from './event-sources/types'
import type { AgeRange, Area, Cost, Vibe } from './types'

const GEMINI_MODEL = 'gemini-2.5-flash'
const BATCH_SIZE = 15
// Events from these sources skip the queue and auto-approve if confidence is high enough
const AUTO_APPROVE_SOURCES = new Set(['parentmap'])
const AUTO_APPROVE_CONFIDENCE = 0.8

export interface EnrichedEvent {
  sourceId: string
  sourceType: string
  isFamilyFriendly: boolean
  confidence: number
  reasoning: string
  title: string
  description: string
  ageRanges: AgeRange[]
  cost: Cost
  vibes: Vibe[]
  area: Area
  locationText: string
  shouldAutoApprove: boolean
}

interface GeminiEnrichedItem {
  source_id: string
  is_family_friendly: boolean
  confidence: number
  reasoning: string
  title: string
  description: string
  age_ranges: string[]
  cost: string
  vibes: string[]
  area: string
  location_text: string
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source_id: { type: 'string' },
          is_family_friendly: { type: 'boolean' },
          confidence: { type: 'number' },
          reasoning: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          age_ranges: {
            type: 'array',
            items: { type: 'string', enum: ['All Ages', 'Toddler', '3-5', '5+', '8+', '12+'] },
          },
          cost: { type: 'string', enum: ['Free', '$', '$$', '$$$'] },
          vibes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['Chill / Easy', 'Burn Energy', 'Outdoor / Nature', 'Rainy Day', 'Special / Treat', 'Animals', 'Transportation'],
            },
          },
          area: {
            type: 'string',
            enum: ['Seattle', 'Eastside', 'North', 'South', 'Tacoma', 'Wider PNW'],
          },
          location_text: { type: 'string' },
        },
        required: [
          'source_id', 'is_family_friendly', 'confidence', 'reasoning',
          'title', 'description', 'age_ranges', 'cost', 'vibes', 'area', 'location_text',
        ],
      },
    },
  },
  required: ['events'],
}

function buildPrompt(events: RawEvent[]): string {
  const items = events.map((e) => ({
    source_id: e.sourceId,
    title: e.title,
    description: e.description?.slice(0, 600) ?? '',
    location: e.location ?? '',
    date: e.startAt.toISOString().slice(0, 10),
    cost_text: e.costText ?? '',
  }))

  return `You are a family-activity curator for Seattle-area parents with kids aged 0–12.

For each event below, evaluate whether it is family-friendly and suitable for taking children to in the Seattle / Pacific Northwest area.

Return one result per event using the event's source_id.

Guidelines:
- is_family_friendly: true if children would enjoy or benefit from attending
- confidence: 0.0–1.0. High (>=0.8) means clearly a kids/family event. Low means adult-focused, unclear, or not local.
- reasoning: one short sentence explaining your score
- title: clean, concise title (remove year suffixes like "2026" unless essential)
- description: 2–3 sentences in an enthusiastic but practical parent voice. What will kids experience? Why is it worth the trip?
- age_ranges: which age groups fit (can be multiple). Use "All Ages" for truly open events.
- cost: estimate from context clues. Default "Free" if no price mentioned for free community events; "$" for cheap; "$$" for moderate; "$$$" for expensive.
- vibes: 1–3 tags from the allowed list that best describe the experience
- area: Seattle neighborhood (use "Seattle" for city events, "Eastside" for Bellevue/Redmond/Kirkland, "North" for north of city, "South" for south of city, "Tacoma" for Tacoma area, "Wider PNW" for outlying areas)
- location_text: human-readable location (venue + neighborhood or city). If unknown, use "Seattle, WA".

Events to evaluate:
${JSON.stringify(items, null, 2)}
`
}

async function callGemini(
  prompt: string,
  apiKey: string,
): Promise<{ ok: true; items: GeminiEnrichedItem[] } | { ok: false; error: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    })
  } catch (e) {
    return { ok: false, error: String(e) }
  }
  if (!res.ok) return { ok: false, error: `Gemini HTTP ${res.status}` }
  let json: unknown
  try { json = await res.json() } catch { return { ok: false, error: 'Bad JSON from Gemini' } }
  const text = (json as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return { ok: false, error: 'Empty Gemini response' }
  try {
    const parsed = JSON.parse(text) as { events: GeminiEnrichedItem[] }
    return { ok: true, items: parsed.events ?? [] }
  } catch {
    return { ok: false, error: 'Failed to parse Gemini JSON' }
  }
}

const VALID_VIBES: Vibe[] = [
  'Chill / Easy', 'Burn Energy', 'Outdoor / Nature', 'Rainy Day',
  'Special / Treat', 'Animals', 'Transportation',
]
const VALID_AGES: AgeRange[] = ['All Ages', 'Toddler', '3-5', '5+', '8+', '12+']
const VALID_AREAS: Area[] = ['Seattle', 'Eastside', 'North', 'South', 'Tacoma', 'Wider PNW']
const VALID_COSTS: Cost[] = ['Free', '$', '$$', '$$$']

function normalise(raw: GeminiEnrichedItem, sourceType: string, confidence: number): EnrichedEvent {
  return {
    sourceId: raw.source_id,
    sourceType,
    isFamilyFriendly: raw.is_family_friendly,
    confidence,
    reasoning: raw.reasoning,
    title: raw.title,
    description: raw.description,
    ageRanges: (raw.age_ranges ?? []).filter((a) => VALID_AGES.includes(a as AgeRange)) as AgeRange[],
    cost: VALID_COSTS.includes(raw.cost as Cost) ? (raw.cost as Cost) : 'Free',
    vibes: (raw.vibes ?? []).filter((v) => VALID_VIBES.includes(v as Vibe)) as Vibe[],
    area: VALID_AREAS.includes(raw.area as Area) ? (raw.area as Area) : 'Seattle',
    locationText: raw.location_text || 'Seattle, WA',
    shouldAutoApprove:
      raw.is_family_friendly &&
      confidence >= AUTO_APPROVE_CONFIDENCE &&
      AUTO_APPROVE_SOURCES.has(sourceType),
  }
}

export async function enrichEvents(
  events: RawEvent[],
): Promise<{ results: Map<string, EnrichedEvent>; errors: string[] }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      results: new Map(),
      errors: ['GEMINI_API_KEY not set — skipping enrichment'],
    }
  }

  const results = new Map<string, EnrichedEvent>()
  const errors: string[] = []

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE)
    const prompt = buildPrompt(batch)
    const geminiResult = await callGemini(prompt, apiKey)

    if (!geminiResult.ok) {
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${geminiResult.error}`)
      continue
    }

    const sourceTypeBySourceId = new Map(batch.map((e) => [e.sourceId, e.sourceType]))
    for (const item of geminiResult.items) {
      const sourceType = sourceTypeBySourceId.get(item.source_id) ?? 'parentmap'
      const confidence = Math.max(0, Math.min(1, item.confidence ?? 0))
      results.set(item.source_id, normalise(item, sourceType, confidence))
    }
  }

  return { results, errors }
}
