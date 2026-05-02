import type { RawEvent } from './types'

const BASE_URL = 'https://www.parentmap.com'
const FETCH_DAYS = 21   // look 3 weeks ahead
const PAGES_PER_DAY = 2 // fetch up to 2 pages (40 events) per day

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#038;/g, '&')
}

// Parse "Saturday, May. 2" with a known year into a Date.
// Returns null if parsing fails.
function parseDateHeader(dateStr: string, year: number): Date | null {
  const clean = dateStr.trim().replace(/\.$/, '')
  // "Saturday, May. 2" -> "May 2, 2026"
  const m = clean.match(/\w+,\s+(\w+)\.?\s+(\d{1,2})/)
  if (!m) return null
  const parsed = new Date(`${m[1]} ${m[2]}, ${year}`)
  if (isNaN(parsed.getTime())) return null
  return parsed
}

// Parse "7:00 a.m." or "3:00 p.m." into hours and minutes (24h).
function parseTime12h(timeStr: string): { h: number; m: number } | null {
  const clean = timeStr.replace(/\s+/g, ' ').trim().toLowerCase()
  const match = clean.match(/(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.|am|pm)/)
  if (!match) return null
  let h = parseInt(match[1], 10)
  const min = parseInt(match[2], 10)
  const period = match[3].replace(/\./g, '')
  if (period === 'pm' && h !== 12) h += 12
  if (period === 'am' && h === 12) h = 0
  return { h, m: min }
}

function applyTime(date: Date, timeStr: string): Date {
  const t = parseTime12h(timeStr)
  if (!t) return date
  const d = new Date(date)
  d.setHours(t.h, t.m, 0, 0)
  return d
}

// Extract a block of events for one calendar page HTML.
// Returns events with a placeholder date that callers fill in.
function parseEventBlocks(html: string, date: Date): RawEvent[] {
  const events: RawEvent[] = []

  // Each event is inside a .views-row div that contains .col-image and .col-content
  const blockRegex = /<div[^>]*class="[^"]*views-row[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g
  // Simpler: find each .col-content block preceded by .col-image
  const contentRegex = /<div class="col-content">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g

  let m: RegExpExecArray | null
  while ((m = contentRegex.exec(html)) !== null) {
    const block = m[1]

    // Title & URL
    const titleMatch = block.match(/class="event-title">\s*<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/)
    if (!titleMatch) continue
    const path = titleMatch[1]
    const title = decodeEntities(titleMatch[2].trim())
    const sourceUrl = `${BASE_URL}${path}`
    const sourceId = path  // e.g. "/calendar/tour-de-cure-2026"

    // Time from event-date block
    const dateBlock = block.match(/class="event-date">([\s\S]*?)<\/h4>/)
    let startAt = new Date(date)
    let endAt: Date | null = null

    if (dateBlock) {
      const times = dateBlock[1].match(/(\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.))/gi) ?? []
      if (times[0]) startAt = applyTime(date, times[0])
      if (times[1]) endAt = applyTime(date, times[1])
    }

    // Description snippet
    const descMatch = block.match(/class="[^"]*field--name-body[^"]*"[^>]*>([\s\S]*?)<\/div>/)
    const description = descMatch ? stripHtml(descMatch[1]) : ''

    // Image
    const imgMatch = block.match(/<img[^>]+src="([^"]+)"/)
    const imageUrl = imgMatch ? imgMatch[1] : null

    events.push({
      sourceType: 'parentmap',
      sourceId,
      sourceUrl,
      title,
      description,
      location: null,  // ParentMap calendar list view doesn't include location
      startAt,
      endAt,
      imageUrl: imageUrl ? `${BASE_URL}${imageUrl}` : null,
      costText: null,
    })
  }

  return events
}

async function fetchCalendarPage(dateStr: string, page: number): Promise<string | null> {
  const url = `${BASE_URL}/calendar?date=${dateStr}&page=${page}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SeattleFamilyBucketList/1.0)' },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

export async function fetchParentMapEvents(): Promise<RawEvent[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Determine what year a "May 2" date header belongs to.
  // If the parsed date is in the past, use next year.
  function resolveYear(date: Date): number {
    return date < today ? today.getFullYear() + 1 : today.getFullYear()
  }

  const allEvents: RawEvent[] = []
  const seenIds = new Set<string>()

  for (let day = 0; day < FETCH_DAYS; day++) {
    const d = new Date(today)
    d.setDate(today.getDate() + day)
    const dateStr = d.toISOString().slice(0, 10)  // YYYY-MM-DD

    for (let page = 0; page < PAGES_PER_DAY; page++) {
      const html = await fetchCalendarPage(dateStr, page)
      if (!html) break

      // Determine the event date from the section header in the HTML
      const sectionMatch = html.match(/<h2 class="section-title[^"]*">([^<]+)<\/h2>/)
      let eventDate = d
      if (sectionMatch) {
        const year = today.getFullYear()
        const parsed = parseDateHeader(sectionMatch[1], year)
        if (parsed) {
          // Verify year — if this date has already passed, assume next year
          if (parsed < today && day === 0) {
            const nextYear = parseDateHeader(sectionMatch[1], year + 1)
            if (nextYear) eventDate = nextYear
          } else {
            eventDate = parsed
          }
        }
      }

      const events = parseEventBlocks(html, eventDate)
      for (const e of events) {
        if (!seenIds.has(e.sourceId)) {
          seenIds.add(e.sourceId)
          allEvents.push(e)
        }
      }

      // If the page has fewer than 20 event titles, no next page
      const eventCount = (html.match(/class="event-title"/g) ?? []).length
      if (eventCount < 20) break
    }
  }

  return allEvents
}
