'use client'

import { useState, useMemo } from 'react'
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek } from 'date-fns'
import type { PlanItem, Outing } from '@/lib/types'
import ItineraryView from './ItineraryView'
import DailyView from './DailyView'
import WeeklyView from './WeeklyView'
import MonthlyView from './MonthlyView'
import LifeBlockPicker from './LifeBlockPicker'
import PlanNotes from './PlanNotes'
import OutingManager from './OutingManager'
import MapView from './MapView'

type ViewMode = 'itinerary' | 'daily' | 'weekly' | 'monthly' | 'map'

interface CalendarViewProps {
  items: PlanItem[]
  userId: string
  onUpdate: (id: string, updates: Partial<PlanItem>) => void
  onDelete: (id: string) => void
  onReorder: (date: string, orderedIds: string[]) => void
  onAddLifeBlock: (block: {
    title: string
    date: string
    duration_minutes: number
    start_time: string | null
    location_url: string | null
    lat: number | null
    lng: number | null
  }) => void
  outings: Outing[]
  selectedOutingId: string | null
  onOutingChange: (outingId: string | null) => void
  onAddOuting: (name: string) => Promise<Outing | null>
  onUpdateOuting: (id: string, name: string) => Promise<void>
  onDeleteOuting: (id: string) => Promise<void>
}

export default function CalendarView({
  items,
  userId,
  onUpdate,
  onDelete,
  onReorder,
  onAddLifeBlock,
  outings,
  selectedOutingId,
  onOutingChange,
  onAddOuting,
  onUpdateOuting,
  onDeleteOuting,
}: CalendarViewProps) {
  const [view, setView] = useState<ViewMode>('itinerary')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showLifeBlock, setShowLifeBlock] = useState(false)
  const [lifeBlockDate, setLifeBlockDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showOutingManager, setShowOutingManager] = useState(false)
  const [copiedOutingId, setCopiedOutingId] = useState<string | null | undefined>(undefined) // undefined = nothing copied, null = copied "all", string = copied outing id

  const handleShareOuting = async (outingId: string | null) => {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outing_id: outingId }),
    })
    const data = await res.json()
    if (data.slug) {
      const url = `${window.location.origin}/plan/${data.slug}`
      await navigator.clipboard.writeText(url)
      setCopiedOutingId(outingId)
      setTimeout(() => setCopiedOutingId(undefined), 2000)
    }
  }

  const weekStart = useMemo(
    () => startOfWeek(new Date(selectedDate + 'T00:00:00')),
    [selectedDate]
  )

  const handleSelectDay = (date: string) => {
    setSelectedDate(date)
    setView('daily')
  }

  const handlePrev = () => {
    if (view === 'daily') {
      setSelectedDate(format(subDays(new Date(selectedDate + 'T00:00:00'), 1), 'yyyy-MM-dd'))
    } else if (view === 'weekly') {
      setSelectedDate(format(subWeeks(new Date(selectedDate + 'T00:00:00'), 1), 'yyyy-MM-dd'))
    } else if (view === 'monthly') {
      setCurrentMonth(subMonths(currentMonth, 1))
    }
  }

  const handleNext = () => {
    if (view === 'daily') {
      setSelectedDate(format(addDays(new Date(selectedDate + 'T00:00:00'), 1), 'yyyy-MM-dd'))
    } else if (view === 'weekly') {
      setSelectedDate(format(addWeeks(new Date(selectedDate + 'T00:00:00'), 1), 'yyyy-MM-dd'))
    } else if (view === 'monthly') {
      setCurrentMonth(addMonths(currentMonth, 1))
    }
  }

  const handleToday = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    setSelectedDate(today)
    setCurrentMonth(new Date())
  }

  const views: { key: ViewMode; label: string }[] = [
    { key: 'itinerary', label: 'List' },
    { key: 'daily', label: 'Day' },
    { key: 'weekly', label: 'Week' },
    { key: 'monthly', label: 'Month' },
    { key: 'map', label: 'Map' },
  ]

  return (
    <div className="space-y-4">
      {/* Outing filter */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {outings.length > 0 && (
            <>
              <div className="flex items-center">
                <button
                  onClick={() => onOutingChange(null)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    selectedOutingId === null
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {copiedOutingId === null ? 'Link copied!' : 'All'}
                </button>
                {selectedOutingId === null && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShareOuting(null) }}
                    className="ml-1 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                    title="Copy share link"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                )}
              </div>
              {outings.map((outing) => {
                const isActive = selectedOutingId === outing.id
                const justCopied = copiedOutingId === outing.id
                return (
                  <div key={outing.id} className="flex items-center">
                    <button
                      onClick={() => onOutingChange(outing.id)}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {justCopied ? 'Link copied!' : outing.name}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShareOuting(outing.id) }}
                      className={`ml-1 rounded-full p-1 transition-colors ${
                        isActive
                          ? 'text-emerald-300 hover:bg-emerald-700 hover:text-white'
                          : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                      }`}
                      title={`Copy share link for ${outing.name}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>
        <button
          onClick={() => setShowOutingManager(true)}
          className="shrink-0 rounded-lg border border-dashed border-gray-300 px-3 py-1 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          {outings.length > 0 ? 'Manage Outings' : '+ New Outing'}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
            {views.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === key
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {view !== 'itinerary' && view !== 'map' && (
            <>
              <button onClick={handlePrev} className="rounded-lg border border-gray-200 bg-white px-2 py-1 hover:bg-gray-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                onClick={handleToday}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Today
              </button>
              <button onClick={handleNext} className="rounded-lg border border-gray-200 bg-white px-2 py-1 hover:bg-gray-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </>
          )}
          <button
            onClick={() => {
              setLifeBlockDate(selectedDate)
              setShowLifeBlock(true)
            }}
            className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            + Add Block
          </button>
        </div>
      </div>

      {/* View title */}
      {view === 'monthly' && (
        <h2 className="text-xl font-bold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
      )}

      {/* Calendar view */}
      {view === 'itinerary' && (
        <ItineraryView items={items} onUpdate={onUpdate} onDelete={onDelete} onReorder={onReorder} outings={outings} />
      )}
      {view === 'daily' && (
        <DailyView items={items} date={selectedDate} onUpdate={onUpdate} onDelete={onDelete} outings={outings} />
      )}
      {view === 'weekly' && (
        <WeeklyView
          items={items}
          weekStart={weekStart}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onSelectDay={handleSelectDay}
        />
      )}
      {view === 'monthly' && (
        <MonthlyView items={items} month={currentMonth} onSelectDay={handleSelectDay} />
      )}
      {view === 'map' && (
        <MapView items={items} />
      )}

      {/* Notes */}
      <PlanNotes userId={userId} />

      {/* Life block modal */}
      {showLifeBlock && (
        <LifeBlockPicker
          date={lifeBlockDate}
          onAdd={(block) => {
            onAddLifeBlock(block)
            setShowLifeBlock(false)
          }}
          onClose={() => setShowLifeBlock(false)}
        />
      )}

      {/* Outing manager modal */}
      {showOutingManager && (
        <OutingManager
          outings={outings}
          onAdd={onAddOuting}
          onUpdate={onUpdateOuting}
          onDelete={onDeleteOuting}
          onClose={() => setShowOutingManager(false)}
        />
      )}
    </div>
  )
}
