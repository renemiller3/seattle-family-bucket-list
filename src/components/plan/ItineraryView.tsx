'use client'

import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PlanItem } from '@/lib/types'
import PlanItemCard from './PlanItem'
import DriveTimeDisplay from './DriveTimeDisplay'

interface ItineraryViewProps {
  items: PlanItem[]
  onUpdate: (id: string, updates: Partial<PlanItem>) => void
  onDelete: (id: string) => void
  onReorder: (date: string, orderedIds: string[]) => void
}

function SortableItem({
  item,
  onUpdate,
  onDelete,
}: {
  item: PlanItem
  onUpdate: (id: string, updates: Partial<PlanItem>) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <PlanItemCard
        item={item}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragHandleProps={listeners}
      />
    </div>
  )
}

export default function ItineraryView({ items, onUpdate, onDelete, onReorder }: ItineraryViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const groupedByDate = useMemo(() => {
    const groups: Record<string, PlanItem[]> = {}
    for (const item of items) {
      if (!groups[item.date]) groups[item.date] = []
      groups[item.date].push(item)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  const handleDragEnd = (event: DragEndEvent, date: string, dateItems: PlanItem[]) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = dateItems.findIndex((item) => item.id === active.id)
    const newIndex = dateItems.findIndex((item) => item.id === over.id)

    const newItems = [...dateItems]
    const [moved] = newItems.splice(oldIndex, 1)
    newItems.splice(newIndex, 0, moved)

    onReorder(date, newItems.map((i) => i.id))
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-lg text-gray-500">No items in your plan yet.</p>
        <p className="mt-1 text-sm text-gray-400">
          Head to Discover to find activities and add them to your calendar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {groupedByDate.map(([date, dateItems]) => (
        <section key={date}>
          <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
          </h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => handleDragEnd(event, date, dateItems)}
          >
            <SortableContext items={dateItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {dateItems.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 && item.travel_time_before && (
                      <DriveTimeDisplay minutes={item.travel_time_before} />
                    )}
                    <SortableItem item={item} onUpdate={onUpdate} onDelete={onDelete} />
                    {item.travel_time_after && index < dateItems.length - 1 && (
                      <DriveTimeDisplay minutes={item.travel_time_after} />
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      ))}
    </div>
  )
}
