'use client'

import { useState } from 'react'
import type { Activity } from '@/lib/types'
import { getVibeEmoji, getCostDisplay } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useBucketList } from '@/hooks/useBucketList'
import AddToPlanModal from './AddToPlanModal'

interface ActivityDetailProps {
  activity: Activity
}

export default function ActivityDetail({ activity }: ActivityDetailProps) {
  const { user } = useAuth()
  const { isOnBucketList, toggleBucketList } = useBucketList(user?.id)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddedToast, setShowAddedToast] = useState(false)
  const [bucketListToast, setBucketListToast] = useState<string | null>(null)
  const isEvent = activity.type === 'event'
  const onBucketList = isOnBucketList(activity.id)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Hero image */}
      {activity.image_url && (
        <div className="mb-6 -mx-4 sm:-mx-6 overflow-hidden rounded-none sm:rounded-xl">
          <img
            src={activity.image_url}
            alt={activity.title}
            className="h-64 w-full object-cover sm:h-80"
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h1 className="text-3xl font-bold text-gray-900">{activity.title}</h1>
          {isEvent && (
            <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
              Event
            </span>
          )}
        </div>
        <p className="text-lg text-gray-600">{activity.description}</p>
      </div>

      {/* Tags */}
      <div className="mb-6 flex flex-wrap gap-2">
        {activity.vibes.map((vibe) => (
          <span
            key={vibe}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700"
          >
            {getVibeEmoji(vibe)} {vibe}
          </span>
        ))}
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
          {activity.area}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
          {getCostDisplay(activity.cost)}
        </span>
        {activity.age_range.map((age) => (
          <span key={age} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
            {age}
          </span>
        ))}
      </div>

      {/* Event dates */}
      {isEvent && activity.start_date && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="font-medium text-amber-800">
            {new Date(activity.start_date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
            {activity.end_date && (
              <>
                {' '}&ndash;{' '}
                {new Date(activity.end_date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </>
            )}
          </p>
          {activity.recurrence && (
            <p className="mt-1 text-sm text-amber-600 capitalize">{activity.recurrence}</p>
          )}
        </div>
      )}

      {/* Location */}
      <div className="mb-6 rounded-lg bg-gray-50 border border-gray-200 p-4">
        <h3 className="mb-1 text-sm font-medium text-gray-500 uppercase tracking-wide">Location</h3>
        <p className="text-gray-900">{activity.location_text}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <a
            href={activity.location_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-emerald-600 hover:text-emerald-700"
          >
            Open in Google Maps &rarr;
          </a>
          {activity.website_url && (
            <a
              href={activity.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-600 hover:text-emerald-700"
            >
              Visit website &rarr;
            </a>
          )}
        </div>
      </div>

      {/* Why it's worth it */}
      <section className="mb-6">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Why It's Worth It</h2>
        <p className="text-gray-700 leading-relaxed">{activity.why_its_worth_it}</p>
        {activity.video_url && (
          <a
            href={activity.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            <span>▶</span> Watch the video
          </a>
        )}
      </section>

      {/* Watch outs */}
      {activity.what_to_watch_out_for.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">What to Watch Out For</h2>
          <ul className="space-y-2">
            {activity.what_to_watch_out_for.map((item, i) => (
              <li key={i} className="flex gap-2 text-gray-700">
                <span className="shrink-0 text-amber-500">&#9888;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tips */}
      {activity.tips && (
        <section className="mb-6">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Tips</h2>
          <p className="text-gray-700">{activity.tips}</p>
        </section>
      )}

      {/* Nearby food */}
      {activity.nearby_food.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Nearby Food</h2>
          <div className="space-y-2">
            {activity.nearby_food.map((food, i) => (
              <div key={i} className="rounded-lg bg-orange-50 border border-orange-200 p-3">
                <p className="font-medium text-gray-900">{food.name}</p>
                <p className="text-sm text-gray-600">{food.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            if (!user) {
              alert('Please sign in to add to your bucket list.')
              return
            }
            toggleBucketList(activity.id)
            setBucketListToast(onBucketList ? 'Removed from bucket list' : 'Added to bucket list!')
            setTimeout(() => setBucketListToast(null), 2000)
          }}
          className={`flex-1 rounded-lg px-6 py-3 text-sm font-medium transition-colors ${
            onBucketList
              ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
              : 'bg-violet-600 text-white hover:bg-violet-700'
          }`}
        >
          {onBucketList ? '✓ On Bucket List' : '♡ Add to Bucket List'}
        </button>
        <button
          onClick={() => {
            if (!user) {
              alert('Please sign in to add activities to your plan.')
              return
            }
            setShowAddModal(true)
          }}
          className="flex-1 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          Add to My Plan
        </button>
      </div>

      {/* Modal */}
      {showAddModal && (
        <AddToPlanModal
          activity={activity}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false)
            setShowAddedToast(true)
            setTimeout(() => setShowAddedToast(false), 3000)
          }}
        />
      )}

      {showAddedToast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          Added to your plan!
        </div>
      )}

      {bucketListToast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {bucketListToast}
        </div>
      )}
    </div>
  )
}
