import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ActivityDetail from '@/components/activities/ActivityDetail'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: activity } = await supabase
    .from('activities')
    .select('title, description, image_url')
    .eq('id', id)
    .single()

  if (!activity) return { title: 'Activity Not Found' }

  const ogImage = activity.image_url?.startsWith('http')
    ? activity.image_url
    : '/images/og-image.jpg'

  return {
    title: `${activity.title} — Seattle Family Bucket List`,
    description: activity.description,
    openGraph: {
      title: `${activity.title} — Seattle Family Bucket List`,
      description: activity.description,
      images: [{ url: ogImage }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: activity.title,
      description: activity.description,
      images: [ogImage],
    },
  }
}

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
