'use client'

import { useState, useMemo } from 'react'
import type { Activity, Area, AgeRange, Cost } from '@/lib/types'
import ActivityCard from '@/components/activities/ActivityCard'
import AddToPlanModal from '@/components/activities/AddToPlanModal'
import SignInPromptModal from '@/components/SignInPromptModal'
import { useAuth } from '@/hooks/useAuth'
import { useBucketList } from '@/hooks/useBucketList'

interface Props {
  events: Activity[]
}

type DateFilter = 'all' | 'this-weekend' | 'next-7' | 'next-30'

function getWeekendRange(): { start: string; end: string } {
  const today = new Date()
  const dow = today.getDay() // 0=Sun, 6=Sat
  const daysToSat = (6 - dow + 7) % 7
  const sat = new Date(today)
  sat.setDate(today.getDate() + (daysToSat === 0 ? 0 : daysToSat))
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)
  return {
    start: sat.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  }
}

function offsetDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function EventsGrid({ events }: Props) {
  const { user } = useAuth()
  const { isOnBucketList, toggleBucketList } = useBucketList(user?.id)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [freeOnly, setFreeOnly] = useState(false)
  const [ageFilter, setAgeFilter] = useState<AgeRange | null>(null)
  const [areaFilter, setAreaFilter] = useState<Area | null>(null)
  const [planActivity, setPlanActivity] = useState<Activity | null>(null)
  const [showSignInPrompt, setShowSignInPrompt] = useState(false)
  const [showAddedToast, setShowAddedToast] = useState(false)

  const filtered = useMemo(() => {
    const today = todayStr()
    const weekend = getWeekendRange()

    return events.filter((e) => {
      const start = e.start_date ?? ''
      const end = e.end_date ?? start

      // Always hide past events
      if (end < today) return false

      if (dateFilter === 'this-weekend') {
        // Event overlaps with this weekend
        if (start > weekend.end || end < weekend.start) return false
      } else if (dateFilter === 'next-7') {
        if (start > offsetDate(7)) return false
      } else if (dateFilter === 'next-30') {
        if (start > offsetDate(30)) return false
      }

      if (freeOnly && e.cost !== 'Free') return false
      if (ageFilter && !e.age_range.includes(ageFilter)) return false
      if (areaFilter && e.area !== areaFilter) return false

      return true
    })
  }, [events, dateFilter, freeOnly, ageFilter, areaFilter])

  const handleAddToPlan = (activity: Activity) => {
    if (!user) { setShowSignInPrompt(true); return }
    setPlanActivity(activity)
  }

  const handleToggleBucketList = (activity: Activity) => {
    if (!user) { setShowSignInPrompt(true); return }
    toggleBucketList(activity.id)
  }

  const handleAdded = () => {
    setPlanActivity(null)
    setShowAddedToast(true)
    setTimeout(() => setShowAddedToast(false), 3000)
  }

  const AREAS: Area[] = ['Seattle', 'Eastside', 'North', 'South', 'Tacoma', 'Wider PNW']
  const AGES: AgeRange[] = ['All Ages', 'Toddler', '3-5', '5+', '8+', '12+']

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 space-y-3">
        {/* Date range quick filters */}
        <div className="flex flex-wrap gap-2">
          {([
            ['all', 'All Upcoming'],
            ['this-weekend', 'This Weekend'],
            ['next-7', 'Next 7 Days'],
            ['next-30', 'Next 30 Days'],
          ] as [DateFilter, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDateFilter(val)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                dateFilter === val
                  ? 'bg-amber-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Secondary filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFreeOnly(!freeOnly)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              freeOnly
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Free Only
          </button>

          <select
            value={ageFilter ?? ''}
            onChange={(e) => setAgeFilter((e.target.value as AgeRange) || null)}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <option value="">Any Age</option>
            {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <select
            value={areaFilter ?? ''}
            onChange={(e) => setAreaFilter((e.target.value as Area) || null)}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <option value="">Any Area</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          {(freeOnly || ageFilter || areaFilter) && (
            <button
              onClick={() => { setFreeOnly(false); setAgeFilter(null); setAreaFilter(null) }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500">
        {filtered.length} {filtered.length === 1 ? 'event' : 'events'}
      </p>

      {/* Event grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((event) => (
            <ActivityCard
              key={event.id}
              activity={event}
              onAddToPlan={handleAddToPlan}
              onToggleBucketList={handleToggleBucketList}
              isOnBucketList={isOnBucketList(event.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-lg text-gray-500">No events found for this filter combo.</p>
          <button
            onClick={() => { setDateFilter('all'); setFreeOnly(false); setAgeFilter(null); setAreaFilter(null) }}
            className="mt-3 text-amber-600 hover:text-amber-700 underline text-sm"
          >
            Clear all filters
          </button>
        </div>
      )}

      {showSignInPrompt && <SignInPromptModal onClose={() => setShowSignInPrompt(false)} />}
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
