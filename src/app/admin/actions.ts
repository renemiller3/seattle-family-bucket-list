'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'
import type {
  ActivityType, AgeRange, Area, Cost, Vibe,
  Recurrence, PregnancyFriendly, CrowdLevel, NearbyFood,
} from '@/lib/types'

export interface ActivityInput {
  title: string
  description: string
  location_text: string
  location_url: string
  lat: number | null
  lng: number | null
  type: ActivityType
  age_range: AgeRange[]
  area: Area
  cost: Cost
  vibes: Vibe[]
  pregnancy_friendly: PregnancyFriendly[]
  crowd_level: CrowdLevel | null
  why_its_worth_it: string
  what_to_watch_out_for: string[]
  tips: string | null
  nearby_food: NearbyFood[]
  start_date: string | null
  end_date: string | null
  recurrence: Recurrence | null
  image_url: string | null
  video_url: string | null
  website_url: string | null
  featured: boolean
  seasons: string[]
}

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user)) {
    throw new Error('Forbidden')
  }
}

function revalidatePublic() {
  revalidatePath('/')
  revalidatePath('/admin')
}

export async function createActivity(input: ActivityInput): Promise<string> {
  await assertAdmin()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('activities')
    .insert(input)
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create activity')
  revalidatePublic()
  revalidatePath(`/activities/${data.id}`)
  return data.id as string
}

export async function updateActivity(id: string, input: ActivityInput): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin
    .from('activities')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePublic()
  revalidatePath(`/activities/${id}`)
}

export async function deleteActivity(id: string): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('activities').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePublic()
  redirect('/admin')
}
