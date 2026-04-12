'use client'

import Link from 'next/link'
import type { Activity } from '@/lib/types'
import { getVibeEmoji, getCostDisplay } from '@/lib/utils'

interface SeasonalRowProps {
  activities: Activity[]
  onAddToPlan?: (activity: Activity) => void
  onToggleBucketList?: (activity: Activity) => void
  isOnBucketList?: (id: string) => boolean
}

function getCurrentSeason(): string {
  const month = new Date().getMonth() // 0-11
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'fall'
  return 'winter'
}

const SEASON_CONFIG: Record<string, { heading: string; emoji: string }> = {
  spring: { heading: "Spring is here! Get outside with the family", emoji: "🌸" },
  summer: { heading: "Make the most of summer together", emoji: "☀️" },
  fall: { heading: "Cozy fall adventures for the family", emoji: "🍂" },
  winter: { heading: "Rainy day? No problem — indoor fun awaits", emoji: "🌧️" },
}

export default function SeasonalRow({ activities, onAddToPlan, onToggleBucketList, isOnBucketList }: SeasonalRowProps) {
  const season = getCurrentSeason()
  const config = SEASON_CONFIG[season]

  const seasonalActivities = activities.filter((a) => a.seasons?.includes(season))

  if (seasonalActivities.length === 0) return null

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-xl font-bold text-gray-900">
          {config.emoji} {config.heading}
        </h2>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="flex gap-5 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 scrollbar-hide">
        {seasonalActivities.map((activity) => {
          const onBucket = isOnBucketList?.(activity.id) ?? false
          return (
            <div
              key={activity.id}
              className="group flex-shrink-0 w-72 sm:w-80 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-lg hover:border-gray-300"
            >
              <Link href={`/activities/${activity.id}`} target="_blank" rel="noopener noreferrer">
                <div className="relative h-44 w-full overflow-hidden bg-gray-100">
                  {activity.image_url ? (
                    <img
                      src={activity.image_url}
                      alt={activity.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-gray-300">
                      🌲
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-10">
                    <h3 className="text-base font-bold text-white leading-tight drop-shadow-sm">
                      {activity.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-white/80">
                      {activity.area} · {getCostDisplay(activity.cost)}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="p-3">
                <div className="mb-2 flex flex-wrap gap-1">
                  {activity.vibes.slice(0, 3).map((vibe) => (
                    <span key={vibe} className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                      {getVibeEmoji(vibe)} {vibe}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  {onToggleBucketList && (
                    <button
                      onClick={() => onToggleBucketList(activity)}
                      className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        onBucket
                          ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                          : 'bg-violet-600 text-white hover:bg-violet-700'
                      }`}
                    >
                      {onBucket ? '✓ Bucket List' : '♡ Bucket List'}
                    </button>
                  )}
                  {onAddToPlan && (
                    <button
                      onClick={() => onAddToPlan(activity)}
                      className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                    >
                      + Add to Outing
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
