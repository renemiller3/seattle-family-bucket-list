import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SharedPlanView from '@/components/sharing/SharedPlanView'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: sharedPlan } = await supabase
    .from('shared_plans')
    .select('title, user_id, outing_id')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  let planTitle = sharedPlan?.title || 'Family Plan'

  // If sharing an outing, use the outing name
  if (sharedPlan?.outing_id) {
    const { data: outing } = await supabase
      .from('outings')
      .select('name')
      .eq('id', sharedPlan.outing_id)
      .maybeSingle()
    if (outing) planTitle = outing.name
  }

  let ownerName = 'Someone'
  if (sharedPlan?.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', sharedPlan.user_id)
      .maybeSingle()
    if (profile) ownerName = profile.display_name.split(' ')[0]
  }

  // Find the first activity image from this outing's items
  let ogImage = '/images/og-image.jpg'
  if (sharedPlan?.user_id) {
    let imageQuery = supabase
      .from('plan_items')
      .select('activity:activities(image_url)')
      .eq('user_id', sharedPlan.user_id)
      .eq('type', 'activity')
      .not('activity_id', 'is', null)

    if (sharedPlan.outing_id) {
      imageQuery = imageQuery.eq('outing_id', sharedPlan.outing_id)
    }

    const { data: itemsWithImages } = await imageQuery.limit(10)
    if (itemsWithImages) {
      const firstWithImage = itemsWithImages.find(
        (item: any) => item.activity?.image_url
      )
      if (firstWithImage) {
        const url = (firstWithImage as any).activity.image_url
        if (url.startsWith('http')) {
          ogImage = url
        } else if (url.startsWith('/')) {
          ogImage = `https://seattle-family-bucket-list.vercel.app${url}`
        }
      }
    }
  }

  const title = `${planTitle} — Shared by ${ownerName}`
  const description = `Check out this family outing plan on Seattle Family Bucket List.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function SharedPlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // Get shared plan
  const { data: sharedPlan } = await supabase
    .from('shared_plans')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!sharedPlan) {
    notFound()
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', sharedPlan.user_id)
    .single()

  // Get plan items — filter by outing if set
  let itemsQuery = supabase
    .from('plan_items')
    .select('*, activity:activities(*)')
    .eq('user_id', sharedPlan.user_id)

  if (sharedPlan.outing_id) {
    itemsQuery = itemsQuery.eq('outing_id', sharedPlan.outing_id)
  }

  const { data: items } = await itemsQuery
    .order('date')
    .order('sort_order')

  // Get outing details (name + lodging)
  let outingName: string | null = null
  let lodging: { name: string; lat: number; lng: number; address?: string | null } | null = null
  if (sharedPlan.outing_id) {
    const { data: outing } = await supabase
      .from('outings')
      .select('name, lodging_name, lodging_address, lodging_lat, lodging_lng')
      .eq('id', sharedPlan.outing_id)
      .maybeSingle()
    outingName = outing?.name ?? null
    if (outing?.lodging_name && outing?.lodging_lat && outing?.lodging_lng) {
      lodging = {
        name: outing.lodging_name,
        lat: outing.lodging_lat,
        lng: outing.lodging_lng,
        address: outing.lodging_address,
      }
    }
  }

  // Only show notes for full calendar shares, not outing-specific ones
  let notesContent: string | null = null
  if (!sharedPlan.outing_id) {
    const { data: noteData } = await supabase
      .from('plan_notes')
      .select('content')
      .eq('user_id', sharedPlan.user_id)
      .limit(1)
      .single()
    notesContent = noteData?.content ?? null
  }

  const pageTitle = sharedPlan.title || outingName || 'Family Plan'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <SharedPlanView
        items={(items as any[]) ?? []}
        notes={notesContent}
        ownerName={profile?.display_name?.split(' ')[0] ?? 'Someone'}
        outingName={outingName || sharedPlan.title || 'Family Plan'}
        lodging={lodging}
      />
    </div>
  )
}
