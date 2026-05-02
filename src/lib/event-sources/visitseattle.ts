import type { RawEvent } from './types'

const RSS_URL = 'https://visitseattle.org/events/feed/'
const CONCURRENCY = 5  // parallel page-scrape requests

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
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
}

function stripCdata(str: string): string {
  return str.replace(/^<!\[CDATA\[|\]\]>$/g, '').trim()
}

function extractTag(xml: string, tag: string): string | null {
  const cdata = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i')
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const cm = xml.match(cdata)
  if (cm) return cm[1].trim()
  const pm = xml.match(plain)
  if (pm) return decodeEntities(pm[1].trim())
  return null
}

interface RssItem {
  title: string
  link: string
  guid: string
  description: string
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = []
  const itemRe = /<item>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1]
    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link')
    const guid = extractTag(block, 'guid') ?? link ?? ''
    const description = extractTag(block, 'content:encoded') ?? extractTag(block, 'description') ?? ''
    if (!title || !link) continue
    items.push({ title, link, guid: stripCdata(guid), description })
  }
  return items
}

// Visit Seattle event pages have dates in <h4> like:
//   <h4><span>7/24/2026 through 7/26/2026</span> | <span>Seattle Center</span></h4>
// We need to scrape each page to get the actual event date.
interface EventPageData {
  startAt: Date | null
  endAt: Date | null
  location: string | null
  imageUrl: string | null
  costText: string | null
}

function parseMDYDate(str: string): Date | null {
  // "7/24/2026" -> Date
  const m = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const d = new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]))
  return isNaN(d.getTime()) ? null : d
}

async function scrapeEventPage(url: string): Promise<EventPageData> {
  const result: EventPageData = { startAt: null, endAt: null, location: null, imageUrl: null, costText: null }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SeattleFamilyBucketList/1.0)' },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
    if (!res.ok) return result
    const html = await res.text()

    // Date pattern: <h4><span>7/24/2026 through 7/26/2026</span>
    const dateMatch = html.match(/<h4[^>]*>\s*<span>([^<]+)<\/span>/)
    if (dateMatch) {
      const dateStr = dateMatch[1].trim()
      const throughMatch = dateStr.match(/^([\d/]+)\s+through\s+([\d/]+)$/)
      if (throughMatch) {
        result.startAt = parseMDYDate(throughMatch[1])
        result.endAt = parseMDYDate(throughMatch[2])
      } else {
        result.startAt = parseMDYDate(dateStr)
      }

      // Location is in the second <span> of the same <h4>
      const locationMatch = html.match(/<h4[^>]*>[\s\S]*?<span>[^<]+<\/span>\s*\|\s*<span>([^<]+)<\/span>/)
      if (locationMatch) result.location = locationMatch[1].trim()
    }

    // Image
    const ogImg = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)
    if (ogImg) result.imageUrl = ogImg[1]

    // Cost – look for common patterns near "admission" / "cost" / "free"
    const costMatch = html.match(/(?:admission|tickets?|cost)[^:]*:\s*([^\n<]{3,60})/i)
    if (costMatch) result.costText = costMatch[1].trim()

  } catch {
    // silently return empty — one bad page shouldn't stop the run
  }
  return result
}

async function scrapeInBatches(items: RssItem[]): Promise<(EventPageData & { item: RssItem })[]> {
  const results: (EventPageData & { item: RssItem })[] = []
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY)
    const scraped = await Promise.all(batch.map((item) => scrapeEventPage(item.link)))
    for (let j = 0; j < batch.length; j++) {
      results.push({ ...scraped[j], item: batch[j] })
    }
  }
  return results
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function fetchVisitSeattleEvents(): Promise<RawEvent[]> {
  let xml: string
  try {
    const res = await fetch(RSS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SeattleFamilyBucketList/1.0)' },
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    })
    if (!res.ok) return []
    xml = await res.text()
  } catch {
    return []
  }

  const rssItems = parseRss(xml)
  if (rssItems.length === 0) return []

  const scraped = await scrapeInBatches(rssItems)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const events: RawEvent[] = []
  for (const { item, startAt, endAt, location, imageUrl, costText } of scraped) {
    // Skip events with no date or events that have already ended
    if (!startAt) continue
    const effectiveEnd = endAt ?? startAt
    if (effectiveEnd < today) continue

    events.push({
      sourceType: 'visitseattle',
      sourceId: item.guid || item.link,
      sourceUrl: item.link,
      title: item.title,
      description: stripHtml(item.description),
      location,
      startAt,
      endAt,
      imageUrl,
      costText,
    })
  }

  return events
}
