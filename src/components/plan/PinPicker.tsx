'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useBucketList } from '@/hooks/useBucketList'
import type { Activity } from '@/lib/types'
import type { RecommendationPin } from '@/app/plan/actions'

type Tab = 'bucket' | 'all' | 'idea'

interface Props {
  pinned: PinDisplay[]
  onAdd: (pin: RecommendationPin, display: PinDisplay) => void
  onClose: () => void
}

export interface PinDisplay {
  key: string
  kind: 'activity' | 'idea'
  label: string
  emoji?: string
}

export default function PinPicker({ pinned, onAdd, onClose }: Props) {
  const { user } = useAuth()
  const { items: bucketItems } = useBucketList(user?.id)
  const [tab, setTab] = useState<Tab>('bucket')
  const [allActivities, setAllActivities] = useState<Activity[]>([])
  const [search, setSearch] = useState('')
  const [ideaText, setIdeaText] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('activities')
      .select('*')
      .order('title')
      .then(({ data }) => {
        setAllActivities((data ?? []) as Activity[])
      })
  }, [])

  const pinnedKeys = useMemo(() => new Set(pinned.map((p) => p.key)), [pinned])

  const bucketChoices = useMemo(() => {
    return bucketItems
      .map((it) => {
        if (it.activity) {
          return {
            key: `activity:${it.activity.id}`,
            kind: 'activity' as const,
            label: it.activity.title,
            sub: it.activity.area,
            pin: { kind: 'activity' as const, activity_id: it.activity.id },
          }
        } else if (it.user_activity) {
          const ua = it.user_activity
          return {
            key: `idea:${ua.title}`,
            kind: 'idea' as const,
            label: ua.title,
            emoji: ua.emoji ?? undefined,
            sub: ua.location_text ?? null,
            pin: { kind: 'idea' as const, text: ua.title },
          }
        }
        return null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  }, [bucketItems])

  const allChoices = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allActivities
      .filter((a) => !q || a.title.toLowerCase().includes(q))
      .slice(0, 50)
      .map((a) => ({
        key: `activity:${a.id}`,
        kind: 'activity' as const,
        label: a.title,
        sub: a.area,
        pin: { kind: 'activity' as const, activity_id: a.id },
      }))
  }, [allActivities, search])

  const handlePick = (choice: {
    key: string
    kind: 'activity' | 'idea'
    label: string
    emoji?: string
    pin: RecommendationPin
  }) => {
    if (pinnedKeys.has(choice.key)) return
    onAdd(choice.pin, {
      key: choice.key,
      kind: choice.kind,
      label: choice.label,
      emoji: choice.emoji,
    })
    onClose()
  }

  const handleAddIdea = () => {
    const text = ideaText.trim()
    if (!text) return
    const key = `idea:${text}`
    if (pinnedKeys.has(key)) return
    onAdd({ kind: 'idea', text }, { key, kind: 'idea', label: text })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div className="my-12 w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">Add something to include</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex border-b border-gray-100 text-sm">
          {([
            ['bucket', 'My bucket list'],
            ['all', 'All activities'],
            ['idea', 'Just an idea'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 px-3 py-2.5 font-medium transition-colors ${
                tab === key
                  ? 'border-b-2 border-emerald-600 text-emerald-700'
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
          {tab === 'bucket' && (
            bucketChoices.length === 0 ? (
              <p className="text-sm text-gray-500">Your bucket list is empty. Add activities from Discover to see them here.</p>
            ) : (
              <ul className="space-y-1.5">
                {bucketChoices.map((c) => {
                  const already = pinnedKeys.has(c.key)
                  return (
                    <li key={c.key}>
                      <button
                        onClick={() => handlePick(c)}
                        disabled={already}
                        className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {c.emoji ? `${c.emoji} ` : ''}{c.label}
                          </div>
                          {c.sub && <div className="truncate text-xs text-gray-500">{c.sub}</div>}
                        </div>
                        {already && <span className="text-xs text-emerald-700">Pinned</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )
          )}

          {tab === 'all' && (
            <>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search activities…"
                className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {allChoices.length === 0 ? (
                <p className="text-sm text-gray-500">No matches.</p>
              ) : (
                <ul className="space-y-1.5">
                  {allChoices.map((c) => {
                    const already = pinnedKeys.has(c.key)
                    return (
                      <li key={c.key}>
                        <button
                          onClick={() => handlePick(c)}
                          disabled={already}
                          className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-gray-900">{c.label}</div>
                            <div className="truncate text-xs text-gray-500">{c.sub}</div>
                          </div>
                          {already && <span className="text-xs text-emerald-700">Pinned</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}

          {tab === 'idea' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Something not on the activity list? It&rsquo;ll be woven in as a step (e.g. &ldquo;Lunch at Mom&rsquo;s&rdquo;, &ldquo;Costco run&rdquo;).
              </p>
              <input
                type="text"
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddIdea() }}
                placeholder="Describe it briefly"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                maxLength={120}
                autoFocus
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAddIdea}
                  disabled={!ideaText.trim()}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
