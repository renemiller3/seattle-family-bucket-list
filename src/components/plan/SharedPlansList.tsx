'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  listMySharedRecommendations,
  deleteSharedRecommendation,
  type SharedRecommendationSummary,
} from '@/app/plan/actions'
import PlanMyDayModal from './PlanMyDayModal'

interface Props {
  onCommitted: (outingId: string) => void
}

export default function SharedPlansList({ onCommitted }: Props) {
  const [shares, setShares] = useState<SharedRecommendationSummary[] | null>(null)
  const [openShareId, setOpenShareId] = useState<string | null>(null)

  const refresh = async () => {
    const res = await listMySharedRecommendations()
    if (res.ok) setShares(res.data)
    else setShares([])
  }

  useEffect(() => {
    refresh()
  }, [])

  if (shares === null || shares.length === 0) return null

  // Hide shares whose outing is committed AND past the date — they're done.
  const today = format(new Date(), 'yyyy-MM-dd')
  const activeShares = shares.filter((s) => !(s.committed_option_index !== null && s.date < today))
  if (activeShares.length === 0) return null

  const handleDelete = async (id: string) => {
    if (!confirm('Stop sharing this plan?')) return
    setShares((prev) => prev?.filter((s) => s.id !== id) ?? null)
    await deleteSharedRecommendation(id)
  }

  const openedShare = openShareId ? shares.find((s) => s.id === openShareId) : null

  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">📨 Shared plans</h2>
        <span className="text-xs text-gray-500">{activeShares.length} pending</span>
      </div>
      <div className="space-y-2">
        {activeShares.map((s) => {
          const dateLabel = format(parseISO(s.date), 'EEE, MMM d')
          const voterNames = Array.from(new Set(s.picks.map((p) => p.voter_name)))
          const committed = s.committed_option_index !== null
          return (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
              <button
                onClick={() => setOpenShareId(s.id)}
                className="flex min-w-0 flex-1 flex-col items-start text-left"
              >
                <div className="text-sm font-medium text-gray-900">{dateLabel}</div>
                <div className="text-xs text-gray-500">
                  {committed ? (
                    <span className="text-emerald-700">✓ Committed to option {s.committed_option_index! + 1}</span>
                  ) : voterNames.length > 0 ? (
                    <span>
                      {voterNames.length} {voterNames.length === 1 ? 'pick' : 'picks'} from {voterNames.join(', ')}
                    </span>
                  ) : (
                    <span>Waiting for votes…</span>
                  )}
                </div>
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="ml-2 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                title="Stop sharing"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      {openedShare && (
        <PlanMyDayModal
          initialDate={openedShare.date}
          shareSlug={openedShare.slug}
          sharedRecommendationId={openedShare.id}
          picks={openedShare.picks}
          initialResult={{
            date: openedShare.date,
            weather: openedShare.weather,
            options: openedShare.options,
          }}
          onClose={() => setOpenShareId(null)}
          onCommitted={(outingId) => {
            setOpenShareId(null)
            refresh()
            onCommitted(outingId)
          }}
        />
      )}
    </section>
  )
}
