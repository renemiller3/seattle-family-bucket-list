'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { usePlanItems } from '@/hooks/usePlanItems'
import { useOutings } from '@/hooks/useOutings'
import { useActivities } from '@/hooks/useActivities'
import { useBucketList } from '@/hooks/useBucketList'
import CalendarView from '@/components/plan/CalendarView'
import NearbyIdeas from '@/components/plan/NearbyIdeas'
import OutingSummary from '@/components/plan/OutingSummary'
import OutingManager from '@/components/plan/OutingManager'
import type { Activity } from '@/lib/types'
import Link from 'next/link'

export default function PlanPage() {
  const { user, loading: authLoading } = useAuth()
  const { items, loading: itemsLoading, updateItem, deleteItem, reorderItems, addItem } = usePlanItems(user?.id)
  const { outings, addOuting, updateOuting, deleteOuting } = useOutings(user?.id)
  const { activities: allActivities } = useActivities()
  const { bucketListIds } = useBucketList(user?.id)
  const [selectedOutingId, setSelectedOutingId] = useState<string | null>(null)
  const [outingManagerOpen, setOutingManagerOpen] = useState(false)

  const sortedOutings = useMemo(() => {
    const earliestDate = new Map<string, string>()
    for (const item of items) {
      if (item.outing_id) {
        const cur = earliestDate.get(item.outing_id)
        if (!cur || item.date < cur) earliestDate.set(item.outing_id, item.date)
      }
    }
    return [...outings].sort((a, b) => {
      const da = earliestDate.get(a.id) ?? ''
      const db = earliestDate.get(b.id) ?? ''
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return da.localeCompare(db)
    })
  }, [outings, items])

  const filteredItems = useMemo(() => {
    let result = items

    // When viewing a specific outing, show all items (past + future)
    // When viewing "All", hide past items
    if (!selectedOutingId) {
      const today = format(new Date(), 'yyyy-MM-dd')
      result = result.filter((item) => item.date >= today)
    } else {
      result = result.filter((item) => item.outing_id === selectedOutingId)
    }

    return result
  }, [items, selectedOutingId])

  const selectedOuting = useMemo(
    () => outings.find((o) => o.id === selectedOutingId) ?? null,
    [outings, selectedOutingId]
  )

  if (authLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-200" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Outings</h1>
        <p className="mb-6 text-gray-600">Sign in to start planning family outings.</p>
        <Link href="/" className="text-emerald-600 hover:text-emerald-700 underline">
          Browse activities
        </Link>
      </div>
    )
  }

  const handleAddSuggestion = async (activity: Activity, date: string) => {
    if (!user) return
    const dateItems = items.filter((i) => i.date === date)
    const maxOrder = dateItems.length > 0 ? Math.max(...dateItems.map((i) => i.sort_order)) + 1 : 0

    await addItem({
      user_id: user.id,
      activity_id: activity.id,
      type: 'activity',
      title: null,
      date,
      start_time: null,
      end_time: null,
      duration_minutes: null,
      travel_time_before: null,
      travel_time_after: null,
      sort_order: maxOrder,
      notes: null,
      is_completed: false,
      location_url: null,
      lat: null,
      lng: null,
      image_url: null,
      outing_id: selectedOutingId,
    })
  }

  const handleAddLifeBlock = async (block: {
    title: string
    date: string
    duration_minutes: number
    start_time: string | null
    location_url: string | null
    lat: number | null
    lng: number | null
    image_url: string | null
  }) => {
    const dateItems = items.filter((i) => i.date === block.date)
    const maxOrder = dateItems.length > 0 ? Math.max(...dateItems.map((i) => i.sort_order)) + 1 : 0

    await addItem({
      user_id: user.id,
      activity_id: null,
      type: 'life_block',
      title: block.title,
      date: block.date,
      start_time: block.start_time,
      end_time: null,
      duration_minutes: block.duration_minutes,
      travel_time_before: null,
      travel_time_after: null,
      sort_order: maxOrder,
      notes: null,
      is_completed: false,
      location_url: block.location_url,
      lat: block.lat,
      lng: block.lng,
      image_url: block.image_url,
      outing_id: selectedOutingId,
    })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {itemsLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-64 rounded bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-200" />
        </div>
      ) : (
        <>
          {selectedOuting && (
            <div className="mb-4">
              <OutingSummary
                outingItems={filteredItems}
                lodgingName={selectedOuting.lodging_name}
                lodgingAddress={selectedOuting.lodging_address}
                variant="interactive"
                onAddLodging={() => setOutingManagerOpen(true)}
              />
            </div>
          )}
          <CalendarView
            items={filteredItems}
            userId={user.id}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onReorder={reorderItems}
            onAddLifeBlock={handleAddLifeBlock}
            outings={sortedOutings}
            selectedOutingId={selectedOutingId}
            onOutingChange={setSelectedOutingId}
            onOpenOutingManager={() => setOutingManagerOpen(true)}
          />
          {selectedOuting && (
            <NearbyIdeas
              outing={selectedOuting}
              outingItems={filteredItems}
              allActivities={allActivities}
              bucketListIds={bucketListIds}
              onAdd={handleAddSuggestion}
            />
          )}
          {outingManagerOpen && (
            <OutingManager
              outings={sortedOutings}
              onAdd={addOuting}
              onUpdate={updateOuting}
              onDelete={deleteOuting}
              onClose={() => setOutingManagerOpen(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
