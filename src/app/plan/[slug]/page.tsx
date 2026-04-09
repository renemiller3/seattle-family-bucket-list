import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SharedPlanView from '@/components/sharing/SharedPlanView'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `Shared Plan - Seattle Family Bucket List`,
    description: `View this shared family outing plan.`,
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

  // Get plan items
  const { data: items } = await supabase
    .from('plan_items')
    .select('*, activity:activities(*)')
    .eq('user_id', sharedPlan.user_id)
    .order('date')
    .order('sort_order')

  // Get notes
  const { data: noteData } = await supabase
    .from('plan_notes')
    .select('content')
    .eq('user_id', sharedPlan.user_id)
    .limit(1)
    .single()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        {sharedPlan.title || 'Family Plan'}
      </h1>
      <SharedPlanView
        items={(items as any[]) ?? []}
        notes={noteData?.content ?? null}
        ownerName={profile?.display_name ?? 'Someone'}
      />
    </div>
  )
}
