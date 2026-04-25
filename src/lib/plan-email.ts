import { format } from 'date-fns'
import type { RecommendationOption } from '@/lib/plan-recommendations'
import type { DailyWeather } from '@/lib/weather'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const VIBE_META: Record<string, { emoji: string; label: string; accent: string }> = {
  'Chill / Easy':    { emoji: '🌿', label: 'CHILL & EASY',  accent: '#0c7a5e' },
  'Burn Energy':     { emoji: '⚡', label: 'BURN ENERGY',   accent: '#b45309' },
  'Special / Treat': { emoji: '✨', label: 'SPECIAL TREAT', accent: '#6d28d9' },
}

function renderOptionsHtml(options: RecommendationOption[]): string {
  return options.map((o, i) => {
    const meta = VIBE_META[o.vibe_label] ?? { emoji: '🗓', label: o.vibe_label.toUpperCase(), accent: '#374151' }
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
}

function renderOptionsText(options: RecommendationOption[]): string {
  return options.map((o, i) => {
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
}

interface PlanEmailArgs {
  date: string
  weather: DailyWeather | null
  options: RecommendationOption[]
  shareUrl: string
  variant:
    | { kind: 'weekly'; firstName: string }
    | { kind: 'share'; senderFirst: string; recipientName: string }
}

export function buildPlanEmail(args: PlanEmailArgs): { subject: string; text: string; html: string } {
  const { date, weather, options, shareUrl, variant } = args
  const dateLabel = format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d')

  const weatherLine = weather
    ? `${weather.conditions} · ${weather.temp_high_f}° / ${weather.temp_low_f}° · ${weather.precipitation_chance}% chance of rain`
    : null

  const subject = variant.kind === 'weekly'
    ? `✨ Your curated weekend adventures for ${dateLabel}`
    : `${variant.senderFirst} wants your pick for ${dateLabel} ✨`

  const headerKicker = variant.kind === 'weekly'
    ? 'Your Personal Weekend Concierge'
    : 'A Family Day Awaits Your Vote'

  const headerHeadline = variant.kind === 'weekly'
    ? `${escapeHtml(variant.firstName)},<br/>your weekend<br/>is planned. ✨`
    : `${escapeHtml(variant.senderFirst)} needs<br/>your pick for<br/>the day. ✨`

  const introCopy = variant.kind === 'weekly'
    ? `We hand-picked <strong style="color:#0f172a">three experiences</strong> for your family — one easy, one active, one special. Each comes with a full itinerary, a coffee stop, and a food recommendation. All you have to do is show up.`
    : `Hey ${escapeHtml(variant.recipientName)} — <strong style="color:#0f172a">${escapeHtml(variant.senderFirst)}</strong> planned three options for the family and wants to know which one you'd love most. Take a look, then tap below to vote. (No sign-in needed.)`

  const ctaHeadline = variant.kind === 'weekly'
    ? 'Share the options with your crew and let them vote.'
    : `Pick the one that sounds best — ${escapeHtml(variant.senderFirst)} will see your vote.`

  const ctaSubcopy = variant.kind === 'weekly'
    ? 'One click — no sign-in needed for them.'
    : 'It takes 10 seconds. No account required.'

  const ctaButton = variant.kind === 'weekly'
    ? 'Open My Weekend Plans →'
    : 'See the Options & Vote →'

  const footerCopy = variant.kind === 'weekly'
    ? 'To change or turn off these emails, visit Settings in the app.'
    : `You got this email because ${escapeHtml(variant.senderFirst)} wanted your input on family plans.`

  // Plain-text fallback
  const greetingText = variant.kind === 'weekly'
    ? `${variant.firstName}, your curated weekend is ready.`
    : `Hey ${variant.recipientName} — ${variant.senderFirst} wants your pick.`

  const introText = variant.kind === 'weekly'
    ? `We picked three adventures for ${dateLabel}${weatherLine ? ' — ' + weatherLine : ''}.`
    : `${variant.senderFirst} planned three options for ${dateLabel}${weatherLine ? ' — ' + weatherLine : ''}. Take a look and vote on your favorite.`

  const ctaText = variant.kind === 'weekly'
    ? `Open in the app & share with your crew:`
    : `Vote here (no sign-in needed):`

  const text = [
    greetingText,
    '',
    introText,
    '',
    renderOptionsText(options),
    '',
    ctaText,
    shareUrl,
    '',
    '— Seattle Family Bucket List',
  ].join('\n')

  const optionsHtml = renderOptionsHtml(options)

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
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;color:rgba(255,255,255,0.4);text-transform:uppercase">${headerKicker}</p>
        <p style="margin:20px 0 8px;font-size:32px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-0.02em">
          ${headerHeadline}
        </p>
        <p style="margin:0;font-size:15px;color:#a7f3d0;font-weight:500">${escapeHtml(dateLabel)}</p>
        ${weatherLine ? `<p style="margin:10px 0 0;font-size:12px;color:rgba(255,255,255,0.45)">${escapeHtml(weatherLine)}</p>` : ''}
      </td></tr>

      <!-- Intro strip -->
      <tr><td style="background:#fff;padding:20px 36px;border-bottom:1px solid #f1f5f9">
        <p style="margin:0;font-size:14px;color:#475569;line-height:1.6">
          ${introCopy}
        </p>
      </td></tr>

      <!-- Options -->
      <tr><td style="background:#f8fafc;padding:28px 24px 12px">
        ${optionsHtml}
      </td></tr>

      <!-- CTA -->
      <tr><td style="background:#fff;padding:32px 36px;text-align:center;border-top:1px solid #f1f5f9">
        <p style="margin:0 0 8px;font-size:13px;color:#64748b">${ctaHeadline}</p>
        <p style="margin:0 0 24px;font-size:13px;color:#64748b">${ctaSubcopy}</p>
        <a href="${escapeHtml(shareUrl)}" style="display:inline-block;background:#059669;color:#fff;font-size:15px;font-weight:700;padding:16px 36px;border-radius:50px;text-decoration:none;letter-spacing:0.01em">
          ${ctaButton}
        </a>
        <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">Or copy this link: <span style="color:#059669">${escapeHtml(shareUrl)}</span></p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#0f172a;border-radius:0 0 20px 20px;padding:24px 36px;text-align:center">
        <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.4)">
          Seattle Family Bucket List &nbsp;·&nbsp; Your weekly adventure companion
        </p>
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25)">
          ${footerCopy}
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`

  return { subject, text, html }
}
