import { getPublicSharedRecommendation } from '@/app/plan/actions'
import SharedRecommendationView from './SharedRecommendationView'

export const dynamic = 'force-dynamic'

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
