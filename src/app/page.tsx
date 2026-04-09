import { createClient } from '@/lib/supabase/server'
import ActivityGrid from '@/components/activities/ActivityGrid'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .order('title')

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <ActivityGrid activities={activities ?? []} />
    </div>
  )
}
