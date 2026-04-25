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

const VIBE_META: Record<string, { emoji: string; label: string; accent: string; muted: string }> = {
  'Chill / Easy':    { emoji: '🌿', label: 'CHILL & EASY',    accent: '#0c7a5e', muted: '#d1fae5' },
  'Burn Energy':     { emoji: '⚡', label: 'BURN ENERGY',     accent: '#b45309', muted: '#fef3c7' },
  'Special / Treat': { emoji: '✨', label: 'SPECIAL TREAT',   accent: '#6d28d9', muted: '#ede9fe' },
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
  const subject = `✨ Your curated weekend adventures for ${dateLabel}`

  const weatherLine = weather
    ? `${weather.conditions} · ${weather.temp_high_f}° / ${weather.temp_low_f}° · ${weather.precipitation_chance}% chance of rain`
    : null

  // Plain-text fallback
  const textOptions = options.map((o, i) => {
    const seq = o.sequence
      .map((s) => `    ${s.time}  ${s.title}${s.notes ? ' — ' + s.notes : ''}`)
      .join('\n')
    return [
      `— Option ${i + 1}: ${o.title} (${o.vibe_label})`,
      `  ${o.pitch}`,
      o.coffee_stop ? `  ☕ ${o.coffee_stop.name} — ${o.coffee_stop.why}` : null,
      o.food_stop   ? `  🍽 ${o.food_stop.name} (${o.food_stop.vicinity})` : null,
      `  ${o.cost_band} · ~${o.total_drive_time_minutes} min driving`,
      `  Itinerary:`,
      seq,
      `  "${o.why_today}"`,
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  const text = [
    `${firstName}, your curated weekend is ready.`,
    '',
    `We picked three adventures for ${dateLabel}${weatherLine ? ' — ' + weatherLine : ''}.`,
    '',
    textOptions,
    '',
    `Open in the app & share with your crew:`,
    shareUrl,
    '',
    '— Seattle Family Bucket List',
    'To manage your email preferences, visit Settings in the app.',
  ].join('\n')

  // Premium HTML
  const optionsHtml = options.map((o, i) => {
    const meta = VIBE_META[o.vibe_label] ?? { emoji: '🗓', label: o.vibe_label.toUpperCase(), accent: '#374151', muted: '#f3f4f6' }
    const imageHtml = o.anchor_activity.image_url
      ? `<img src="${escapeHtml(o.anchor_activity.image_url)}" alt="${escapeHtml(o.anchor_activity.title)}" width="560" style="display:block;width:100%;height:200px;object-fit:cover;border-radius:0" />`
      : ''

    const seqRows = o.sequence.map((s) =>
      `<tr>
        <td style="padding:5px 14px 5px 0;font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#94a3b8;white-space:nowrap;vertical-align:top;letter-spacing:0.05em">${escapeHtml(s.time)}</td>
        <td style="padding:5px 0;font-size:13px;color:#1e293b;vertical-align:top;line-height:1.5">
          <span style="font-weight:600">${escapeHtml(s.title)}</span>${s.notes ? `<span style="color:#64748b;font-weight:400"> — ${escapeHtml(s.notes)}</span>` : ''}
        </td>
      </tr>`
    ).join('')

    const coffeeHtml = o.coffee_stop ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">
        <tr>
          <td style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;padding:10px 14px">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#92400e;text-transform:uppercase">Morning Coffee</span><br/>
            <span style="font-size:13px;color:#1e293b;font-weight:600">☕ ${escapeHtml(o.coffee_stop.name)}</span>
            <span style="font-size:12px;color:#64748b"> · ${escapeHtml(o.coffee_stop.vicinity)}</span><br/>
            <span style="font-size:12px;color:#78716c;font-style:italic">${escapeHtml(o.coffee_stop.why)}</span>
          </td>
        </tr>
      </table>` : ''

    const foodHtml = o.food_stop ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px">
        <tr>
          <td style="background:#f0fdf4;border-left:3px solid #22c55e;border-radius:0 6px 6px 0;padding:10px 14px">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#166534;text-transform:uppercase">Where to Eat</span><br/>
            <span style="font-size:13px;color:#1e293b;font-weight:600">🍽 ${escapeHtml(o.food_stop.name)}</span>
            <span style="font-size:12px;color:#64748b"> · ${escapeHtml(o.food_stop.vicinity)}</span><br/>
            <span style="font-size:12px;color:#78716c;font-style:italic">${escapeHtml(o.food_stop.why)}</span>
          </td>
        </tr>
      </table>` : ''

    return `
    <!-- Option ${i + 1} -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <tr><td style="background:#fff">
        ${imageHtml}
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:${meta.accent};padding:10px 20px 10px 20px">
              <span style="font-size:10px;font-weight:800;letter-spacing:0.15em;color:rgba(255,255,255,0.75);text-transform:uppercase">Option ${i + 1}</span>
              <span style="font-size:10px;font-weight:800;letter-spacing:0.15em;color:rgba(255,255,255,0.5)"> &nbsp;·&nbsp; </span>
              <span style="font-size:10px;font-weight:800;letter-spacing:0.15em;color:rgba(255,255,255,0.75);text-transform:uppercase">${meta.emoji} ${meta.label}</span>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:20px 20px 0">
              <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;line-height:1.3">${escapeHtml(o.title)}</p>
              <p style="margin:0 0 4px;font-size:14px;color:#475569;line-height:1.5">${escapeHtml(o.pitch)}</p>
              <p style="margin:0;font-size:12px;color:#94a3b8">${escapeHtml(o.cost_band)} &nbsp;·&nbsp; ~${o.total_drive_time_minutes} min driving</p>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:16px 20px 0">
              ${coffeeHtml}
              ${foodHtml}
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:16px 20px">
              <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:0.12em;color:#94a3b8;text-transform:uppercase">Day Itinerary</p>
              <table cellpadding="0" cellspacing="0">${seqRows}</table>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:0 20px 20px">
              <p style="margin:0;font-size:12px;font-style:italic;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:14px">${escapeHtml(o.why_today)}</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:24px 16px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#0f2027 0%,#1a3a2a 50%,#0f2027 100%);border-radius:20px 20px 0 0;padding:40px 36px 36px;text-align:center">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.2em;color:#6ee7b7;text-transform:uppercase">Seattle Family Bucket List</p>
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;color:rgba(255,255,255,0.4);text-transform:uppercase">Your Personal Weekend Concierge</p>
        <p style="margin:20px 0 8px;font-size:32px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-0.02em">
          ${escapeHtml(firstName)},<br/>your weekend<br/>is planned. ✨
        </p>
        <p style="margin:0;font-size:15px;color:#a7f3d0;font-weight:500">${escapeHtml(dateLabel)}</p>
        ${weatherLine ? `<p style="margin:10px 0 0;font-size:12px;color:rgba(255,255,255,0.45)">${escapeHtml(weatherLine)}</p>` : ''}
      </td></tr>

      <!-- Intro strip -->
      <tr><td style="background:#fff;padding:20px 36px;border-bottom:1px solid #f1f5f9">
        <p style="margin:0;font-size:14px;color:#475569;line-height:1.6">
          We hand-picked <strong style="color:#0f172a">three experiences</strong> for your family — one easy, one active, one special. Each comes with a full itinerary, a coffee stop, and a food recommendation. All you have to do is show up.
        </p>
      </td></tr>

      <!-- Options -->
      <tr><td style="background:#f8fafc;padding:28px 24px 12px">
        ${optionsHtml}
      </td></tr>

      <!-- CTA -->
      <tr><td style="background:#fff;padding:32px 36px;text-align:center;border-top:1px solid #f1f5f9">
        <p style="margin:0 0 8px;font-size:13px;color:#64748b">Share the options with your crew and let them vote.</p>
        <p style="margin:0 0 24px;font-size:13px;color:#64748b">One click — no sign-in needed for them.</p>
        <a href="${escapeHtml(shareUrl)}" style="display:inline-block;background:#059669;color:#fff;font-size:15px;font-weight:700;padding:16px 36px;border-radius:50px;text-decoration:none;letter-spacing:0.01em">
          Open My Weekend Plans →
        </a>
        <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">Or copy this link: <span style="color:#059669">${escapeHtml(shareUrl)}</span></p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#0f172a;border-radius:0 0 20px 20px;padding:24px 36px;text-align:center">
        <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.4)">
          Seattle Family Bucket List &nbsp;·&nbsp; Your weekly adventure companion
        </p>
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25)">
          To change or turn off these emails, visit Settings in the app.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`

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
    .select('id, display_name, weekly_plan_day')
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

  // Pull crew rows for the cohort that opted in to receive the weekly email.
  const { data: crewRows } = await admin
    .from('crew_members')
    .select('user_id, email')
    .in('user_id', userIds)
    .not('email', 'is', null)
    .eq('receives_weekly_plan', true)
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
    const cc = crewByUser.get(p.id) ?? []

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
