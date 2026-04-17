import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAdminEmail } from '@/lib/email'

interface FeedbackBody {
  message?: string
  submitted_by?: string | null
  page_url?: string | null
}

export async function POST(request: Request) {
  let body: FeedbackBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const submittedBy = body.submitted_by?.trim() || null
  const pageUrl = body.page_url?.trim() || null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('feedback').insert({
    user_id: user?.id ?? null,
    message,
    submitted_by: submittedBy,
    page_url: pageUrl,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }

  const subject = `New feedback${submittedBy ? ` from ${submittedBy}` : ''}`
  const lines = [
    message,
    '',
    submittedBy ? `Submitted by: ${submittedBy}` : null,
    pageUrl ? `From page: ${pageUrl}` : null,
    user?.email ? `User email: ${user.email}` : null,
  ].filter((l) => l !== null) as string[]

  await sendAdminEmail(subject, lines.join('\n'))

  return NextResponse.json({ ok: true })
}
