'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek } from 'date-fns'
import type { PlanItem, Outing } from '@/lib/types'
import { useProfile } from '@/hooks/useProfile'
import ItineraryView from './ItineraryView'
import DailyView from './DailyView'
import WeeklyView from './WeeklyView'
import MonthlyView from './MonthlyView'
import LifeBlockPicker from './LifeBlockPicker'
import PlanNotes from './PlanNotes'
import OutingManager from './OutingManager'
import MapView from './MapView'

type ViewMode = 'itinerary' | 'daily' | 'weekly' | 'monthly'

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
    image_url: string | null
  }) => void
  outings: Outing[]
  selectedOutingId: string | null
  onOutingChange: (outingId: string | null) => void
  onAddOuting: (name: string) => Promise<Outing | null>
  onUpdateOuting: (id: string, updates: Partial<Pick<Outing, 'name' | 'lodging_name' | 'lodging_address' | 'lodging_lat' | 'lodging_lng'>>) => Promise<void>
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
  const [showLifeBlock, setShowLifeBlock] = useState(false)
  const [lifeBlockDate, setLifeBlockDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showOutingManager, setShowOutingManager] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [copiedOutingId, setCopiedOutingId] = useState<string | null | undefined>(undefined)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [pickerOpen])

  const selectedOuting = useMemo(
    () => (selectedOutingId ? outings.find((o) => o.id === selectedOutingId) : null) ?? null,
    [selectedOutingId, outings]
  )

  const { profile } = useProfile(userId)

  const homeLocation = useMemo(() => {
    if (!profile?.home_lat || !profile?.home_lng || !profile?.home_address) return null
    return { lat: profile.home_lat, lng: profile.home_lng, address: profile.home_address }
  }, [profile])

  const lodgingPin = useMemo(() => {
    if (!selectedOuting?.lodging_lat || !selectedOuting?.lodging_lng || !selectedOuting?.lodging_name) return null
    return {
      name: selectedOuting.lodging_name,
      lat: selectedOuting.lodging_lat,
      lng: selectedOuting.lodging_lng,
      address: selectedOuting.lodging_address,
    }
  }, [selectedOuting])

  // Derive month and week from selectedDate (single source of truth)
  const currentMonth = useMemo(() => new Date(selectedDate + 'T00:00:00'), [selectedDate])
  const weekStart = useMemo(
    () => startOfWeek(new Date(selectedDate + 'T00:00:00')),
    [selectedDate]
  )

  // Auto-navigate to first date with items when outing changes
  useEffect(() => {
    if (selectedOutingId && items.length > 0) {
      const dates = items.map((i) => i.date).sort()
      if (dates.length > 0) {
        setSelectedDate(dates[0])
      }
    } else if (!selectedOutingId) {
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
    }
  }, [selectedOutingId, items])

  const handleShareOuting = async (outingId: string | null) => {
    let url: string | undefined
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outing_id: outingId }),
      })
      const data = await res.json()
      if (!data.slug) return
      url = `${window.location.origin}/plan/${data.slug}`

      if (typeof navigator.share === 'function') {
        // Native share sheet on mobile — works reliably on iOS Safari after await
        try {
          await navigator.share({ url, title: 'My Seattle outing' })
        } catch (e) {
          if ((e as Error).name !== 'AbortError') throw e
        }
        return
      }

      // Desktop: clipboard copy
      await navigator.clipboard.writeText(url)
      setCopiedOutingId(outingId)
      setTimeout(() => setCopiedOutingId(undefined), 2000)
    } catch {
      // Last resort: prompt so the user can copy manually
      if (url) prompt('Copy this link:', url)
    }
  }

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
      setSelectedDate(format(subMonths(new Date(selectedDate + 'T00:00:00'), 1), 'yyyy-MM-dd'))
    }
  }

  const handleNext = () => {
    if (view === 'daily') {
      setSelectedDate(format(addDays(new Date(selectedDate + 'T00:00:00'), 1), 'yyyy-MM-dd'))
    } else if (view === 'weekly') {
      setSelectedDate(format(addWeeks(new Date(selectedDate + 'T00:00:00'), 1), 'yyyy-MM-dd'))
    } else if (view === 'monthly') {
      setSelectedDate(format(addMonths(new Date(selectedDate + 'T00:00:00'), 1), 'yyyy-MM-dd'))
    }
  }

  const handleToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
  }

  const views: { key: ViewMode; label: string }[] = [
    { key: 'itinerary', label: 'List' },
    { key: 'daily', label: 'Day' },
    { key: 'weekly', label: 'Week' },
    { key: 'monthly', label: 'Month' },
  ]

  return (
    <div className="space-y-4">
      {/* Row 1: Title + primary action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">
          {selectedOuting?.name ?? 'All Outings'}
        </h1>
        <button
          onClick={() => {
            setLifeBlockDate(selectedDate)
            setShowLifeBlock(true)
          }}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          + Add Activity
        </button>
      </div>

      {/* Row 2: All controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Outing picker */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <span>{selectedOuting?.name ?? 'All Outings'}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {pickerOpen && (
            <div className="absolute left-0 top-full z-40 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => { onOutingChange(null); setPickerOpen(false) }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${selectedOutingId === null ? 'font-medium text-emerald-700' : 'text-gray-700'}`}
              >
                <span className="w-4 text-emerald-600">{selectedOutingId === null ? '✓' : ''}</span>
                <span>All Outings</span>
              </button>
              {outings.map((o) => (
                <button
                  key={o.id}
                  onClick={() => { onOutingChange(o.id); setPickerOpen(false) }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${selectedOutingId === o.id ? 'font-medium text-emerald-700' : 'text-gray-700'}`}
                >
                  <span className="w-4 text-emerald-600">{selectedOutingId === o.id ? '✓' : ''}</span>
                  <span className="truncate">{o.name}</span>
                </button>
              ))}
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={() => { setPickerOpen(false); setShowOutingManager(true) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50"
              >
                <span className="w-4">+</span>
                <span>New Outing</span>
              </button>
              {outings.length > 0 && (
                <button
                  onClick={() => { setPickerOpen(false); setShowOutingManager(true) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-0.5">
                    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span>Manage Outings</span>
                </button>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => handleShareOuting(selectedOutingId)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Share outing"
        >
          {copiedOutingId !== undefined ? (
            <span className="text-xs text-emerald-600 font-medium">Copied!</span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>

        <div className="h-6 w-px bg-gray-200" />

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

        <div className="h-6 w-px bg-gray-200" />

        {/* Navigation */}
        <button onClick={handlePrev} className="rounded-lg border border-gray-200 bg-white px-2 py-1 hover:bg-gray-50">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button onClick={handleToday} className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Today
        </button>
        <button onClick={handleNext} className="rounded-lg border border-gray-200 bg-white px-2 py-1 hover:bg-gray-50">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </button>

        {/* Map toggle (list view only) */}
        {view === 'itinerary' && (
          <>
            <div className="h-6 w-px bg-gray-200" />
            <button
              onClick={() => setShowMap(!showMap)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                showMap
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
                <path d="M8 2v16" /><path d="M16 6v16" />
              </svg>
              {showMap ? 'Hide Map' : 'Map'}
            </button>
          </>
        )}
      </div>

      {/* View title (for week/month) */}
      {view === 'weekly' && (
        <h2 className="text-lg font-semibold text-gray-900">
          {format(weekStart, 'MMMM d')} – {format(addDays(weekStart, 6), 'MMMM d, yyyy')}
        </h2>
      )}
      {view === 'monthly' && (
        <h2 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
      )}

      {/* Map (inline above list when toggled) */}
      {view === 'itinerary' && showMap && (
        <MapView items={items} lodging={lodgingPin} homeLocation={homeLocation} />
      )}

      {/* Calendar view */}
      {view === 'itinerary' && (
        <ItineraryView items={items} onUpdate={onUpdate} onDelete={onDelete} onReorder={onReorder} outings={outings} lodging={lodgingPin} />
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
