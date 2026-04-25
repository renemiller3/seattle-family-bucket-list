import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { generateSlug } from '@/lib/utils'
import { buildRecommendationsForUser, type RecommendationOption } from '@/lib/plan-recommendations'
import type { DailyWeather } from '@/lib/weather'
import type { DayOfWeek } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // up to 5 minutes for Gemini calls

const DAY_NAMES: DayOfWeek[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
]

function dayOfWeekInPT(d: Date): DayOfWeek {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
  }).format(d).toLowerCase()
  return name as DayOfWeek
}

function ymdInPT(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = parts.find((p) => p.type === 'year')!.value
  const m = parts.find((p) => p.type === 'month')!.value
  const day = parts.find((p) => p.type === 'day')!.value
  return `${y}-${m}-${day}`
}

function nextSaturdayYmd(todayYmd: string): string {
  // todayYmd is local PT date. Return the next Saturday strictly after today.
  const [y, m, d] = todayYmd.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow = date.getUTCDay() // 0=Sun ... 6=Sat
  const daysUntilSat = (6 - dow + 7) % 7
  const offset = daysUntilSat === 0 ? 7 : daysUntilSat
  date.setUTCDate(date.getUTCDate() + offset)
  const ny = date.getUTCFullYear()
  const nm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const nd = String(date.getUTCDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}

function expiryFromDate(dateStr: string): string {
  const d = new Date(dateStr + 'T23:59:59')
  d.setDate(d.getDate() + 7)
  return d.toISOString()
}

interface ProfileRow {
  id: string
  display_name: string | null
  weekly_plan_day: DayOfWeek | null
  weekly_plan_include_crew: boolean
}

interface CrewRow {
  user_id: string
  email: string | null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildEmail(args: {
  firstName: string
  date: string
  weather: DailyWeather | null
  options: RecommendationOption[]
  shareUrl: string
}): { subject: string; text: string; html: string } {
  const { firstName, date, weather, options, shareUrl } = args
  const dateLabel = format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d')
  const subject = `Your Plan-my-day options for ${dateLabel}`

  const weatherLine = weather
    ? `${weather.conditions} · ${weather.temp_high_f}° / ${weather.temp_low_f}° · ${weather.precipitation_chance}% precip`
    : ''

  const textOptions = options.map((o, i) => {
    const seq = o.sequence
      .map((s) => `    ${s.time}  ${s.title}${s.notes ? ' — ' + s.notes : ''}`)
      .join('\n')
    return [
      `${i + 1}. ${o.vibe_label} — ${o.title}`,
      `   ${o.pitch}`,
      `   Coffee: ${o.coffee_stop?.name ?? '—'}${o.coffee_stop ? ' (' + o.coffee_stop.vicinity + ')' : ''}`,
      o.food_stop ? `   Food: ${o.food_stop.name} (${o.food_stop.vicinity})` : null,
      `   Cost: ${o.cost_band} · Drive: ~${o.total_drive_time_minutes} min`,
      `   Plan:`,
      seq,
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  const text = [
    `Hi ${firstName},`,
    '',
    `Here are three Plan-my-day options for ${dateLabel}.`,
    weatherLine ? `Forecast: ${weatherLine}` : '',
    '',
    textOptions,
    '',
    `See the full plan and share with your crew:`,
    shareUrl,
    '',
    '— Seattle Family Bucket List',
  ].filter(Boolean).join('\n')

  const vibeColors: Record<string, string> = {
    'Chill / Easy': '#0369a1',
    'Burn Energy': '#c2410c',
    'Special / Treat': '#7c3aed',
  }

  const optionsHtml = options.map((o, i) => {
    const color = vibeColors[o.vibe_label] ?? '#374151'
    const seqHtml = o.sequence.map((s) => `
      <tr>
        <td style="padding:4px 12px 4px 0;font-family:ui-monospace,monospace;font-size:12px;color:#6b7280;white-space:nowrap;vertical-align:top">${escapeHtml(s.time)}</td>
        <td style="padding:4px 0;font-size:14px;color:#111;vertical-align:top">
          <strong>${escapeHtml(s.title)}</strong>${s.notes ? `<span style="color:#6b7280"> — ${escapeHtml(s.notes)}</span>` : ''}
        </td>
      </tr>`).join('')

    const coffee = o.coffee_stop
      ? `<p style="margin:8px 0 0;font-size:13px;color:#374151">☕ <strong>${escapeHtml(o.coffee_stop.name)}</strong> (${escapeHtml(o.coffee_stop.vicinity)}) — ${escapeHtml(o.coffee_stop.why)}</p>`
      : ''
    const food = o.food_stop
      ? `<p style="margin:4px 0 0;font-size:13px;color:#374151">🍽 <strong>${escapeHtml(o.food_stop.name)}</strong> (${escapeHtml(o.food_stop.vicinity)}) — ${escapeHtml(o.food_stop.why)}</p>`
      : ''

    return `
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:16px;background:#fff">
        <div style="display:inline-block;padding:2px 10px;border-radius:999px;background:${color}1a;color:${color};font-size:12px;font-weight:600;margin-bottom:8px">
          ${escapeHtml(o.vibe_label)}
        </div>
        <h3 style="margin:0 0 4px;font-size:17px;color:#111">${i + 1}. ${escapeHtml(o.title)}</h3>
        <p style="margin:0;font-size:14px;color:#4b5563">${escapeHtml(o.pitch)}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#6b7280">
          ${escapeHtml(o.cost_band)} · ~${o.total_drive_time_minutes} min driving
        </p>
        ${coffee}
        ${food}
        <table style="margin-top:12px;border-collapse:collapse">${seqHtml}</table>
        <p style="margin:12px 0 0;font-size:12px;font-style:italic;color:#6b7280">${escapeHtml(o.why_today)}</p>
      </div>
    `
  }).join('')

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;color:#111;background:#f9fafb;padding:24px">
      <p style="margin:0 0 8px;color:#374151">Hi ${escapeHtml(firstName)},</p>
      <h2 style="margin:0 0 4px;font-size:20px">Plan-my-day for ${escapeHtml(dateLabel)}</h2>
      ${weatherLine ? `<p style="margin:0 0 16px;font-size:13px;color:#6b7280">${escapeHtml(weatherLine)}</p>` : '<div style="height:8px"></div>'}

      ${optionsHtml}

      <p style="margin:24px 0;text-align:center">
        <a href="${escapeHtml(shareUrl)}" style="background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Open in app &amp; share with crew
        </a>
      </p>
      <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:32px">
        Seattle Family Bucket List · You can change or turn off these emails in Settings.
      </p>
    </div>
  `

  return { subject, text, html }
}

function getSiteUrl(request: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  const host = request.headers.get('host')
  if (host) return `https://${host}`
  return 'http://localhost:3000'
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const todayDow = dayOfWeekInPT(now)
  const todayYmd = ymdInPT(now)
  const targetDate = nextSaturdayYmd(todayYmd)

  if (!DAY_NAMES.includes(todayDow)) {
    return NextResponse.json({ error: 'Bad day-of-week computation' }, { status: 500 })
  }

  const admin = createAdminClient()
  const { data: profiles, error: profilesErr } = await admin
    .from('profiles')
    .select('id, display_name, weekly_plan_day, weekly_plan_include_crew')
    .eq('weekly_plan_day', todayDow)
    .returns<ProfileRow[]>()

  if (profilesErr) {
    return NextResponse.json({ error: 'Failed to load profiles' }, { status: 500 })
  }
  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, day: todayDow, target_date: targetDate, sent: 0 })
  }

  // Resolve user emails via auth.users (admin only).
  const userIds = profiles.map((p) => p.id)
  const emailById = new Map<string, string>()
  for (const id of userIds) {
    const { data, error } = await admin.auth.admin.getUserById(id)
    if (!error && data?.user?.email) emailById.set(id, data.user.email)
  }

  // Pull crew rows for the cohort (single query).
  const { data: crewRows } = await admin
    .from('crew_members')
    .select('user_id, email')
    .in('user_id', userIds)
    .not('email', 'is', null)
    .returns<CrewRow[]>()

  const crewByUser = new Map<string, string[]>()
  for (const r of crewRows ?? []) {
    if (!r.email) continue
    const list = crewByUser.get(r.user_id) ?? []
    list.push(r.email)
    crewByUser.set(r.user_id, list)
  }

  const siteUrl = getSiteUrl(request)
  let sent = 0
  let skipped = 0
  const errors: { user_id: string; reason: string }[] = []

  for (const p of profiles) {
    const userEmail = emailById.get(p.id)
    if (!userEmail) {
      skipped++
      errors.push({ user_id: p.id, reason: 'no email on auth user' })
      continue
    }

    const result = await buildRecommendationsForUser(p.id, targetDate, [])
    if (!result.ok) {
      skipped++
      errors.push({ user_id: p.id, reason: result.error })
      continue
    }

    // Persist a shared recommendation so the email link opens a real plan.
    let slug: string | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = generateSlug()
      const { data, error } = await admin
        .from('shared_recommendations')
        .insert({
          user_id: p.id,
          slug: candidate,
          date: targetDate,
          weather: result.data.weather,
          options: result.data.options,
          expires_at: expiryFromDate(targetDate),
        })
        .select('slug')
        .single()
      if (data?.slug) { slug = data.slug; break }
      if (error && !error.message?.includes('duplicate')) break
    }
    if (!slug) {
      skipped++
      errors.push({ user_id: p.id, reason: 'could not create share record' })
      continue
    }

    const firstName = p.display_name?.split(' ')[0] ?? 'there'
    const shareUrl = `${siteUrl}/share/${slug}`
    const cc = p.weekly_plan_include_crew ? (crewByUser.get(p.id) ?? []) : []

    const { subject, text, html } = buildEmail({
      firstName,
      date: targetDate,
      weather: result.data.weather,
      options: result.data.options,
      shareUrl,
    })

    const ok = await sendEmail(userEmail, subject, text, html, { cc })
    if (ok) sent++
    else {
      skipped++
      errors.push({ user_id: p.id, reason: 'email send failed' })
    }
  }

  return NextResponse.json({
    ok: true,
    day: todayDow,
    target_date: targetDate,
    matched: profiles.length,
    sent,
    skipped,
    errors,
  })
}
