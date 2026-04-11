'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Activity, Vibe } from '@/lib/types'
import ActivityCard from './ActivityCard'
import VibeButtons from './VibeButtons'
import FilterBar, { type Filters } from './FilterBar'
import EventsList from './EventsList'
import AddToPlanModal from './AddToPlanModal'
import { useAuth } from '@/hooks/useAuth'
import { useBucketList } from '@/hooks/useBucketList'
import DiscoverMap from './DiscoverMap'

interface ActivityGridProps {
  activities: Activity[]
}

export default function ActivityGrid({ activities }: ActivityGridProps) {
  const { user } = useAuth()
  const { isOnBucketList, toggleBucketList } = useBucketList(user?.id)
  const [filters, setFilters] = useState<Filters>({
    vibes: [],
    ageRange: null,
    area: null,
    cost: null,
    type: null,
  })
  const [planActivity, setPlanActivity] = useState<Activity | null>(null)
  const [showAddedToast, setShowAddedToast] = useState(false)

  const handleVibeToggle = (vibe: Vibe) => {
    setFilters((prev) => ({
      ...prev,
      vibes: prev.vibes.includes(vibe)
        ? prev.vibes.filter((v) => v !== vibe)
        : [...prev.vibes, vibe],
    }))
  }

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (filters.vibes.length > 0 && !filters.vibes.some((v) => a.vibes.includes(v))) return false
      if (filters.ageRange && !a.age_range.includes(filters.ageRange)) return false
      if (filters.area && a.area !== filters.area) return false
      if (filters.cost && a.cost !== filters.cost) return false
      if (filters.type && a.type !== filters.type) return false
      return true
    })
  }, [activities, filters])

  const regularActivities = filtered
  const events = filtered.filter((a) => a.start_date !== null)
    .sort((a, b) => {
      if (!a.start_date) return 1
      if (!b.start_date) return -1
      return a.start_date.localeCompare(b.start_date)
    })

  const handleAddToPlan = (activity: Activity) => {
    if (!user) {
      alert('Please sign in to add activities to your plan.')
      return
    }
    setPlanActivity(activity)
  }

  const handleToggleBucketList = (activity: Activity) => {
    if (!user) {
      alert('Please sign in to add to your bucket list.')
      return
    }
    toggleBucketList(activity.id)
  }

  const handleAdded = () => {
    setPlanActivity(null)
    setShowAddedToast(true)
    setTimeout(() => setShowAddedToast(false), 3000)
  }

  return (
    <div>
      {/* Hero */}
      <section className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">
          What kind of day do you want?
        </h1>
        <p className="mb-6 text-gray-600">
          Pick a vibe and discover family activities around Seattle.
        </p>
        <VibeButtons selected={filters.vibes} onToggle={handleVibeToggle} />
      </section>

      {/* Filters */}
      <section className="mb-6">
        <FilterBar filters={filters} onChange={setFilters} />
      </section>

      {/* Map */}
      <DiscoverMap activities={filtered} />

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500">
        {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
      </p>

      {/* Activity cards */}
      {regularActivities.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {regularActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onAddToPlan={handleAddToPlan}
              onToggleBucketList={handleToggleBucketList}
              isOnBucketList={isOnBucketList(activity.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-lg text-gray-500">No activities match your filters.</p>
          <button
            onClick={() => setFilters({ vibes: [], ageRange: null, area: null, cost: null, type: null })}
            className="mt-2 text-emerald-600 hover:text-emerald-700 underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Events */}
      <EventsList events={events} />

      {/* Suggest */}
      <div className="mt-12 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-lg font-medium text-gray-700">Know a great family activity we're missing?</p>
        <Link
          href="/suggest"
          className="mt-3 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          Suggest a Bucket List Item
        </Link>
      </div>

      {/* Add to plan modal */}
      {planActivity && (
        <AddToPlanModal
          activity={planActivity}
          onClose={() => setPlanActivity(null)}
          onAdded={handleAdded}
        />
      )}

      {/* Toast */}
      {showAddedToast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg md:bottom-8">
          Added to your outing!
        </div>
      )}
    </div>
  )
}
