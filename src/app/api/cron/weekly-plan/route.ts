import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { generateSlug } from '@/lib/utils'
import { buildRecommendationsForUser } from '@/lib/plan-recommendations'
import { buildPlanEmail } from '@/lib/plan-email'
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

    const { subject, text, html } = buildPlanEmail({
      date: targetDate,
      weather: result.data.weather,
      options: result.data.options,
      shareUrl,
      variant: { kind: 'weekly', firstName },
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
