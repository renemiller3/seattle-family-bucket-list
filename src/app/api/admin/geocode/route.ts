import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { geocodeFromMapsUrl } from '@/lib/geocode'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url).searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 })
  }

  const coords = await geocodeFromMapsUrl(url)
  if (!coords) {
    return NextResponse.json({ error: 'Could not extract coordinates' }, { status: 422 })
  }

  return NextResponse.json(coords)
}
