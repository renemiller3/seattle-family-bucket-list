const AT_COORD_RE = /@(-?\d+\.\d+),(-?\d+\.\d+)/
const BANG_COORD_RE = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/
const Q_COORD_RE = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/
const LL_COORD_RE = /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/

function extractFromUrl(url: string): { lat: number; lng: number } | null {
  for (const re of [AT_COORD_RE, BANG_COORD_RE, Q_COORD_RE, LL_COORD_RE]) {
    const m = url.match(re)
    if (m) {
      const lat = Number(m[1])
      const lng = Number(m[2])
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    }
  }
  return null
}

async function followRedirects(url: string, maxHops = 5): Promise<string> {
  let current = url
  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(current, { redirect: 'manual', method: 'GET' })
    const loc = res.headers.get('location')
    if (!loc) return res.url || current
    current = new URL(loc, current).toString()
  }
  return current
}

export async function geocodeFromMapsUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = url.trim()
  if (!trimmed) return null

  const direct = extractFromUrl(trimmed)
  if (direct) return direct

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  const shortHosts = ['maps.app.goo.gl', 'goo.gl', 'g.co']
  if (shortHosts.some((h) => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
    try {
      const resolved = await followRedirects(trimmed)
      return extractFromUrl(resolved)
    } catch {
      return null
    }
  }

  return null
}
