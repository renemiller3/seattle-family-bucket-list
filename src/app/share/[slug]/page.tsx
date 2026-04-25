import type { Metadata } from 'next'
import { format, parseISO } from 'date-fns'
import { getPublicSharedRecommendation } from '@/app/plan/actions'
import SharedRecommendationView from './SharedRecommendationView'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const res = await getPublicSharedRecommendation(slug)

  if (!res.ok) {
    return {
      title: 'Plan not found',
      description: 'This shared plan is no longer available.',
    }
  }

  const { date, owner_name, options, weather } = res.data
  const ownerFirst = owner_name.split(' ')[0]
  const dateLabel = format(parseISO(date), 'EEEE, MMMM d')

  const title = `${ownerFirst} wants your pick — ${dateLabel}`
  const optionTitles = options.slice(0, 3).map((o) => o.title).join(' • ')
  const weatherBit = weather ? ` · ${weather.conditions}, ${weather.temp_high_f}°` : ''
  const description = `${optionTitles}${weatherBit}. Tap to vote — no sign-in needed.`

  const ogImage =
    options.find((o) => o.anchor_activity?.image_url)?.anchor_activity?.image_url ?? null

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

export default async function SharedRecommendationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const res = await getPublicSharedRecommendation(slug)

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Plan not found</h1>
        <p className="text-gray-600">{res.error}</p>
      </div>
    )
  }

  return <SharedRecommendationView slug={slug} initial={res.data} expired={res.expired} />
}
