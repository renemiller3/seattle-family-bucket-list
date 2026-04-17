import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAdminEmail } from '@/lib/email'

interface SuggestionBody {
  name?: string
  description?: string | null
  location?: string | null
  submitted_by?: string | null
}

export async function POST(request: Request) {
  let body: SuggestionBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const description = body.description?.trim() || null
  const location = body.location?.trim() || null
  const submittedBy = body.submitted_by?.trim() || null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('activity_suggestions').insert({
    user_id: user?.id ?? null,
    name,
    description,
    location,
    submitted_by: submittedBy,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to save suggestion' }, { status: 500 })
  }

  const subject = `New bucket list suggestion: ${name}`
  const lines = [
    `Name: ${name}`,
    description ? `Why great for families: ${description}` : null,
    location ? `Location: ${location}` : null,
    submittedBy ? `Submitted by: ${submittedBy}` : null,
    user?.email ? `User email: ${user.email}` : null,
  ].filter(Boolean) as string[]

  await sendAdminEmail(subject, lines.join('\n'))

  return NextResponse.json({ ok: true })
}
