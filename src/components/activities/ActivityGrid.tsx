'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import type { Activity, Vibe } from '@/lib/types'
import ActivityCard from './ActivityCard'
import VibeButtons from './VibeButtons'
import FilterBar, { type Filters } from './FilterBar'
import AddToPlanModal from './AddToPlanModal'
import { useAuth } from '@/hooks/useAuth'
import { useBucketList } from '@/hooks/useBucketList'
import DiscoverMap from './DiscoverMap'
import FeaturedRow from './FeaturedRow'
import SeasonalRow from './SeasonalRow'

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
  const [showMap, setShowMap] = useState(false)
  const [selectedMapActivity, setSelectedMapActivity] = useState<string | null>(null)
  const [mapTop, setMapTop] = useState(0)
  const cardGridRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Measure where the card grid starts so the map aligns perfectly
  useEffect(() => {
    if (showMap) {
      // Measure after render so layout is settled
      const measure = () => {
        if (cardGridRef.current) {
          setMapTop(cardGridRef.current.getBoundingClientRect().top)
        }
      }
      requestAnimationFrame(measure)
      // Re-measure on scroll since fixed positioning uses viewport coords
      window.scrollTo(0, 0)
      requestAnimationFrame(measure)
    }
  }, [showMap])

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

  const featuredActivities = useMemo(() => {
    const seasonOrder = ['spring', 'summer', 'fall', 'winter']
    const month = new Date().getMonth()
    const currentSeason = month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer' : month >= 8 && month <= 10 ? 'fall' : 'winter'
    const currentIndex = seasonOrder.indexOf(currentSeason)
    // Rotate so current season comes first
    const rotated = [...seasonOrder.slice(currentIndex), ...seasonOrder.slice(0, currentIndex)]

    return activities.filter((a) => a.featured).sort((a, b) => {
      const aSeasonIndex = Math.min(...(a.seasons?.map((s) => rotated.indexOf(s)).filter((i) => i >= 0) ?? [rotated.length]))
      const bSeasonIndex = Math.min(...(b.seasons?.map((s) => rotated.indexOf(s)).filter((i) => i >= 0) ?? [rotated.length]))
      if (aSeasonIndex !== bSeasonIndex) return aSeasonIndex - bSeasonIndex
      return a.title.localeCompare(b.title)
    })
  }, [activities])

  // Shuffle the grid order using a daily seed so it feels fresh but stable within a session
  const regularActivities = useMemo(() => {
    const seed = new Date().toISOString().slice(0, 10) // changes daily
    const shuffled = [...filtered]
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i)
      hash |= 0
    }
    for (let i = shuffled.length - 1; i > 0; i--) {
      hash = ((hash << 5) - hash) + i
      hash |= 0
      const j = Math.abs(hash) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }, [filtered])

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

  const handleMapSelectActivity = useCallback((activityId: string | null) => {
    setSelectedMapActivity(activityId)
    if (activityId && cardRefs.current[activityId]) {
      cardRefs.current[activityId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  // ─── Map View ───
  if (showMap) {
    return (
      <div>
        {/* Single row compact filters for map view */}
        <div className="mb-3">
          <FilterBar filters={filters} onChange={setFilters} compact />
        </div>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filtered.length} {filtered.length === 1 ? 'adventure' : 'adventures'} to explore
          </p>
          <button
            onClick={() => setShowMap(false)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            Grid View
          </button>
        </div>

        {/* Mobile: full-screen map */}
        <div className="md:hidden">
          <DiscoverMap
            activities={filtered}
            selectedActivityId={selectedMapActivity}
            onSelectActivity={setSelectedMapActivity}
            className="h-[calc(100vh-14rem)] w-full overflow-hidden rounded-xl border border-gray-200"
          />
        </div>

        {/* Desktop: split view with fixed map */}
        <div className="hidden md:block">
          {/* Fixed map on right half — below header + filters + results row */}
          <div className="fixed right-0 bottom-0 w-1/2 pb-3 pr-3" style={{ top: mapTop > 0 ? `${mapTop}px` : '11.5rem' }}>
            <DiscoverMap
              activities={filtered}
              selectedActivityId={selectedMapActivity}
              onSelectActivity={handleMapSelectActivity}
              className="h-full w-full overflow-hidden rounded-xl border border-gray-200"
            />
          </div>

          {/* Cards on left half, scrolls normally */}
          <div className="w-1/2 pr-2" ref={cardGridRef}>
            <div className="grid grid-cols-2 gap-3">
              {regularActivities.map((activity) => (
                <div
                  key={activity.id}
                  ref={(el) => { cardRefs.current[activity.id] = el }}
                  className={`transition-all rounded-xl ${
                    selectedMapActivity === activity.id ? 'ring-2 ring-emerald-500' : ''
                  }`}
                >
                  <ActivityCard
                    activity={activity}
                    onAddToPlan={handleAddToPlan}
                    onToggleBucketList={handleToggleBucketList}
                    isOnBucketList={isOnBucketList(activity.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modals and toasts */}
        {planActivity && (
          <AddToPlanModal activity={planActivity} onClose={() => setPlanActivity(null)} onAdded={handleAdded} />
        )}
        {showAddedToast && (
          <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
            Added to your outing!
          </div>
        )}
      </div>
    )
  }

  // ─── Default Grid View ───
  return (
    <div>
      {/* Hero */}
      <section className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">
          Your family's next adventure starts here
        </h1>
        <p className="mb-6 text-gray-600">
          {activities.length} adventures to explore. Pick a vibe to narrow it down.
        </p>
        <VibeButtons selected={filters.vibes} onToggle={handleVibeToggle} />
      </section>

      {/* Filters */}
      <section className="mb-6">
        <FilterBar filters={filters} onChange={setFilters} />
      </section>

      {/* Featured */}
      <FeaturedRow
        activities={featuredActivities}
        onAddToPlan={handleAddToPlan}
        onToggleBucketList={handleToggleBucketList}
        isOnBucketList={isOnBucketList}
      />

      {/* Seasonal */}
      <SeasonalRow
        activities={activities}
        onAddToPlan={handleAddToPlan}
        onToggleBucketList={handleToggleBucketList}
        isOnBucketList={isOnBucketList}
      />

      {/* Results count + map toggle */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filtered.length} {filtered.length === 1 ? 'adventure' : 'adventures'} to explore
        </p>
        <button
          onClick={() => setShowMap(true)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
            <path d="M8 2v16" />
            <path d="M16 6v16" />
          </svg>
          Explore Map
        </button>
      </div>

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
          <p className="text-lg text-gray-500">Nothing yet for this combo — try loosening up your filters!</p>
          <p className="mt-1 text-sm text-gray-400">Or check out the Must-Do picks above.</p>
          <button
            onClick={() => setFilters({ vibes: [], ageRange: null, area: null, cost: null, type: null })}
            className="mt-3 text-emerald-600 hover:text-emerald-700 underline"
          >
            Clear all filters
          </button>
        </div>
      )}

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
        <AddToPlanModal activity={planActivity} onClose={() => setPlanActivity(null)} onAdded={handleAdded} />
      )}

      {/* Toast */}
      {showAddedToast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          Added to your outing!
        </div>
      )}
    </div>
  )
}
