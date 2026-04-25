'use server'

import { createClient } from '@/lib/supabase/server'
import type { CrewMember } from '@/lib/types'

type CrewListResponse = { ok: true; data: CrewMember[] } | { ok: false; error: string }
type CrewMutateResponse = { ok: true; data: CrewMember } | { ok: false; error: string }

export async function listCrew(): Promise<CrewListResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in." }
  const { data, error } = await supabase
    .from('crew_members')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return { ok: false, error: "Couldn't load your crew." }
  return { ok: true, data: (data ?? []) as CrewMember[] }
}

export async function addCrewMember(input: {
  name: string
  phone: string | null
  email: string | null
}): Promise<CrewMutateResponse> {
  const name = (input.name ?? '').trim()
  if (!name) return { ok: false, error: "Add a name." }
  if (name.length > 60) return { ok: false, error: "Name is too long." }
  const phone = (input.phone ?? '').trim() || null
  const email = (input.email ?? '').trim() || null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in." }

  const { data: existing } = await supabase
    .from('crew_members')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = existing && existing[0] ? existing[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('crew_members')
    .insert({ user_id: user.id, name, phone, email, sort_order: nextOrder })
    .select('*')
    .single()
  if (error || !data) return { ok: false, error: "Couldn't add that person. Please try again." }
  return { ok: true, data: data as CrewMember }
}

export async function updateCrewMember(
  id: string,
  input: { name?: string; phone?: string | null; email?: string | null }
): Promise<CrewMutateResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in." }
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) return { ok: false, error: "Name can't be empty." }
    patch.name = name
  }
  if (input.phone !== undefined) patch.phone = input.phone?.trim() || null
  if (input.email !== undefined) patch.email = input.email?.trim() || null

  const { data, error } = await supabase
    .from('crew_members')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()
  if (error || !data) return { ok: false, error: "Couldn't update that person." }
  return { ok: true, data: data as CrewMember }
}

export async function deleteCrewMember(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  await supabase.from('crew_members').delete().eq('id', id).eq('user_id', user.id)
  return { ok: true }
}
