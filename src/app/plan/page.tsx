'use client'

import { useAuth } from '@/hooks/useAuth'
import { usePlanItems } from '@/hooks/usePlanItems'
import CalendarView from '@/components/plan/CalendarView'
import ShareButton from '@/components/sharing/ShareButton'
import Link from 'next/link'

export default function PlanPage() {
  const { user, loading: authLoading } = useAuth()
  const { items, loading: itemsLoading, updateItem, deleteItem, reorderItems, addItem } = usePlanItems(user?.id)

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
        <h1 className="mb-2 text-2xl font-bold text-gray-900">My Calendar</h1>
        <p className="mb-6 text-gray-600">Sign in to start planning family outings.</p>
        <Link href="/" className="text-emerald-600 hover:text-emerald-700 underline">
          Browse activities
        </Link>
      </div>
    )
  }

  const handleAddLifeBlock = async (block: {
    title: string
    date: string
    duration_minutes: number
    start_time: string | null
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
    })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">My Calendar</h1>
        <ShareButton />
      </div>
      {itemsLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-64 rounded bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-200" />
        </div>
      ) : (
        <CalendarView
          items={items}
          userId={user.id}
          onUpdate={updateItem}
          onDelete={deleteItem}
          onReorder={reorderItems}
          onAddLifeBlock={handleAddLifeBlock}
        />
      )}
    </div>
  )
}
