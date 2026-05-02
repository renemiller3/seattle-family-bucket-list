'use client'

import { useState, useTransition } from 'react'
import { approveEvent, rejectEvent, approveAllHighConfidence } from '@/app/admin/events/actions'
import type { EventQueueItem } from '@/lib/types'

interface Props {
  items: EventQueueItem[]
}

const SOURCE_LABELS: Record<string, string> = {
  parentmap: 'ParentMap',
  visitseattle: 'Visit Seattle',
  seattle_center: 'Seattle Center',
  manual: 'Manual',
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-xs">—</span>
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? 'bg-emerald-100 text-emerald-700' : pct >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {pct}%
    </span>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' })
}

function EventRow({ item, onApprove, onReject, busy }: {
  item: EventQueueItem
  onApprove: (id: string) => void
  onReject: (id: string) => void
  busy: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const title = item.ai_title || item.raw_title
  const description = item.ai_description || item.raw_description
  const location = item.ai_location_text || item.raw_location

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        {item.raw_image_url && (
          <img src={item.raw_image_url} alt="" className="h-16 w-24 flex-shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {SOURCE_LABELS[item.source_type] ?? item.source_type}
            </span>
            <ConfidenceBadge score={item.ai_confidence} />
            {item.ai_is_family_friendly === false && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">Not family-friendly</span>
            )}
          </div>
          <h3 className="mt-1 font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">
            {formatDate(item.raw_start_at)}
            {item.raw_end_at && item.raw_end_at.slice(0, 10) !== item.raw_start_at.slice(0, 10) && (
              <> – {formatDate(item.raw_end_at)}</>
            )}
            {location && <> · {location}</>}
          </p>
          {item.ai_reasoning && (
            <p className="mt-1 text-xs text-gray-400 italic">{item.ai_reasoning}</p>
          )}
          {expanded && description && (
            <p className="mt-2 text-sm text-gray-600">{description}</p>
          )}
          {(description || item.source_url) && (
            <div className="mt-1 flex gap-3">
              {description && (
                <button onClick={() => setExpanded(!expanded)} className="text-xs text-emerald-600 hover:underline">
                  {expanded ? 'Less' : 'More'}
                </button>
              )}
              {item.source_url && (
                <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                  Source ↗
                </a>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-col gap-2">
          <button
            disabled={busy}
            onClick={() => onApprove(item.id)}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            Approve
          </button>
          <button
            disabled={busy}
            onClick={() => onReject(item.id)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EventsAdminQueue({ items }: Props) {
  const [isPending, startTransition] = useTransition()
  const [bulkResult, setBulkResult] = useState<string | null>(null)

  const pending = items.filter((i) => i.review_status === 'pending')
  const highConfidence = pending.filter((i) => (i.ai_confidence ?? 0) >= 0.75 && i.ai_is_family_friendly !== false)
  const needsReview = pending.filter((i) => (i.ai_confidence ?? 0) < 0.75 || i.ai_is_family_friendly === false)

  function handleApprove(id: string) {
    startTransition(async () => {
      await approveEvent(id)
    })
  }

  function handleReject(id: string) {
    startTransition(async () => {
      await rejectEvent(id)
    })
  }

  function handleApproveAll() {
    startTransition(async () => {
      const result = await approveAllHighConfidence()
      setBulkResult(`Approved ${result.approved} event${result.approved !== 1 ? 's' : ''}.`)
      setTimeout(() => setBulkResult(null), 4000)
    })
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-lg font-medium text-gray-700">Queue is empty</p>
        <p className="mt-1 text-sm text-gray-400">
          All events have been reviewed. The cron job runs nightly to fetch new ones.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex gap-6 text-sm">
          <span>
            <span className="font-semibold text-gray-900">{pending.length}</span>
            <span className="text-gray-500"> pending</span>
          </span>
          <span>
            <span className="font-semibold text-emerald-600">{highConfidence.length}</span>
            <span className="text-gray-500"> high confidence</span>
          </span>
          <span>
            <span className="font-semibold text-yellow-600">{needsReview.length}</span>
            <span className="text-gray-500"> needs review</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {bulkResult && (
            <span className="text-sm font-medium text-emerald-600">{bulkResult}</span>
          )}
          {highConfidence.length > 0 && (
            <button
              disabled={isPending}
              onClick={handleApproveAll}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              Approve All High Confidence ({highConfidence.length})
            </button>
          )}
        </div>
      </div>

      {/* High confidence group */}
      {highConfidence.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            High Confidence — ready to approve
          </h2>
          <div className="space-y-3">
            {highConfidence
              .sort((a, b) => a.raw_start_at.localeCompare(b.raw_start_at))
              .map((item) => (
                <EventRow
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  busy={isPending}
                />
              ))}
          </div>
        </section>
      )}

      {/* Needs review group */}
      {needsReview.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Needs Review
          </h2>
          <div className="space-y-3">
            {needsReview
              .sort((a, b) => a.raw_start_at.localeCompare(b.raw_start_at))
              .map((item) => (
                <EventRow
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  busy={isPending}
                />
              ))}
          </div>
        </section>
      )}
    </div>
  )
}
