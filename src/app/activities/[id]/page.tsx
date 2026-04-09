import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ActivityDetail from '@/components/activities/ActivityDetail'

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: activity } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .single()

  if (!activity) {
    notFound()
  }

  return <ActivityDetail activity={activity} />
}
