// Lightweight Open-Meteo client for daily forecast lookups.
// No API key required. Returns null when the date is outside the forecast window
// (Open-Meteo only forecasts ~16 days ahead) so callers can fall back to season.

export interface DailyWeather {
  date: string
  temp_high_f: number
  temp_low_f: number
  precipitation_chance: number // 0–100
  conditions: string // human-readable
  is_wet: boolean // > 50% chance of precip — drives indoor preference
}

// WMO weather code → human label. Pared-down for the Seattle climate.
function describeWeatherCode(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 48) return 'Foggy'
  if (code <= 57) return 'Drizzle'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Showers'
  if (code <= 86) return 'Snow showers'
  if (code <= 99) return 'Thunderstorms'
  return 'Mixed'
}

export async function fetchDailyWeather(
  lat: number,
  lng: number,
  date: string // YYYY-MM-DD
): Promise<DailyWeather | null> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat.toString())
  url.searchParams.set('longitude', lng.toString())
  url.searchParams.set(
    'daily',
    'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code'
  )
  url.searchParams.set('temperature_unit', 'fahrenheit')
  url.searchParams.set('timezone', 'America/Los_Angeles')
  url.searchParams.set('start_date', date)
  url.searchParams.set('end_date', date)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) return null
  const json = await res.json()
  const d = json?.daily
  if (!d || !Array.isArray(d.time) || d.time.length === 0) return null

  const idx = 0
  const high = d.temperature_2m_max?.[idx]
  const low = d.temperature_2m_min?.[idx]
  const precip = d.precipitation_probability_max?.[idx] ?? 0
  const code = d.weather_code?.[idx] ?? 0

  if (high == null || low == null) return null

  return {
    date,
    temp_high_f: Math.round(high),
    temp_low_f: Math.round(low),
    precipitation_chance: precip,
    conditions: describeWeatherCode(code),
    is_wet: precip >= 50,
  }
}
