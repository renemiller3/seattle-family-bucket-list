'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { submitRecommendationPick } from '@/app/plan/actions'
import type { RecommendationOption, RecommendationPick } from '@/app/plan/actions'
import type { DailyWeather } from '@/lib/weather'
import ExploreNearbyLink from '@/components/plan/ExploreNearbyLink'

interface PublicShareData {
  slug: string
  date: string
  owner_name: string
  weather: DailyWeather | null
  options: RecommendationOption[]
  committed_option_index: number | null
  expires_at: string
  picks: RecommendationPick[]
}

interface Props {
  slug: string
  initial: PublicShareData
  expired: boolean
}

const NAME_STORAGE_KEY = 'shared-rec-voter-name'

function formatDriveTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min driving`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h} hr driving`
  return `${h} hr ${m} min driving`
}

export default function SharedRecommendationView({ slug, initial, expired }: Props) {
  const [picks, setPicks] = useState<RecommendationPick[]>(initial.picks)
  const [voterName, setVoterName] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    try { return localStorage.getItem(NAME_STORAGE_KEY) ?? '' } catch { return '' }
  })
  const [voting, setVoting] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [showCommentFor, setShowCommentFor] = useState<number | null>(null)
  const [justVoted, setJustVoted] = useState(false)

  const dateLabel = format(new Date(initial.date + 'T00:00:00'), 'EEEE, MMMM d')
  const committed = initial.committed_option_index

  const picksByOption = useMemo(() => {
    const map = new Map<number, RecommendationPick[]>()
    for (const p of picks) {
      const list = map.get(p.option_index) ?? []
      list.push(p)
      map.set(p.option_index, list)
    }
    return map
  }, [picks])

  const handleVote = async (optionIndex: number) => {
    setError(null)
    if (!voterName.trim()) {
      setError("Please add your name first so they know who voted.")
      return
    }
    setVoting(optionIndex)
    try {
      localStorage.setItem(NAME_STORAGE_KEY, voterName.trim())
    } catch {}
    const res = await submitRecommendationPick(slug, voterName, optionIndex, comment)
    setVoting(null)
    if (!res.ok) {
      setError(res.error)
      return
    }
    // Optimistic add — server-truth on next page load
    setPicks((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        voter_name: voterName.trim(),
        option_index: optionIndex,
        comment: comment.trim() || null,
        created_at: new Date().toISOString(),
      },
    ])
    setComment('')
    setShowCommentFor(null)
    setJustVoted(true)
    setTimeout(() => setJustVoted(false), 4000)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">{initial.owner_name.split(' ')[0]}</span> wants to do something on
        </p>
        <h1 className="mt-0.5 text-2xl font-bold text-gray-900">{dateLabel}</h1>
        {initial.weather && (
          <p className="mt-1 text-sm text-gray-600">
            {initial.weather.conditions} · {initial.weather.temp_high_f}° / {initial.weather.temp_low_f}° ·{' '}
            {initial.weather.precipitation_chance}% precip
          </p>
        )}
      </header>

      {expired && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This plan is past — it&rsquo;s no longer accepting votes.
        </div>
      )}

      {committed !== null && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ {initial.owner_name.split(' ')[0]} picked option {committed + 1}!
        </div>
      )}

      {!expired && committed === null && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Your name</span>
            <input
              type="text"
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              placeholder="So they know who voted"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          {justVoted && (
            <p className="mt-2 text-sm text-emerald-700">Thanks! Your pick is in.</p>
          )}
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="space-y-4">
        {initial.options.map((option, idx) => {
          const isCommitted = committed === idx
          const optPicks = picksByOption.get(idx) ?? []
          const vibeColor = {
            'Chill / Easy': 'bg-sky-50 text-sky-700 border-sky-200',
            'Burn Energy': 'bg-orange-50 text-orange-700 border-orange-200',
            'Special / Treat': 'bg-violet-50 text-violet-700 border-violet-200',
          }[option.vibe_label] ?? 'bg-gray-50 text-gray-700 border-gray-200'

          return (
            <div
              key={idx}
              className={`overflow-hidden rounded-xl border bg-white ${
                isCommitted ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-gray-200'
              }`}
            >
              {option.anchor_activity.image_url && (
                <img
                  src={option.anchor_activity.image_url}
                  alt={option.anchor_activity.title}
                  className="h-40 w-full object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${vibeColor}`}>
                        {option.vibe_label}
                      </span>
                      {isCommitted && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          ✓ We&rsquo;re doing this!
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-gray-900">{option.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{option.pitch}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>{option.cost_band}</div>
                    <div>{formatDriveTime(option.total_drive_time_minutes)}</div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Plan</div>
                  <ol className="mt-1.5 space-y-1.5">
                    {option.sequence.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="w-12 shrink-0 font-mono text-xs text-gray-500">{step.time}</span>
                        <span className="flex-1">
                          <span className="font-medium text-gray-900">{step.title}</span>
                          {step.notes && <span className="text-gray-600"> — {step.notes}</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                {option.coffee_stop && (
                  <div className="mt-2 text-xs text-gray-600">
                    ☕ <span className="font-medium">{option.coffee_stop.name}</span> ({option.coffee_stop.vicinity}) — {option.coffee_stop.why}
                  </div>
                )}

                {option.food_stop && (
                  <div className="mt-2 text-xs text-gray-600">
                    🍽 <span className="font-medium">{option.food_stop.name}</span> ({option.food_stop.vicinity}) — {option.food_stop.why}
                  </div>
                )}

                <p className="mt-3 text-xs italic text-gray-500">{option.why_today}</p>

                {optPicks.length > 0 && (
                  <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-rose-600">
                      Picked by {optPicks.length}
                    </div>
                    <ul className="mt-1 space-y-1">
                      {optPicks.map((p) => (
                        <li key={p.id} className="text-sm text-gray-700">
                          <span className="mr-1">❤️</span>
                          <span className="font-medium">{p.voter_name}</span>
                          {p.comment && <span className="text-gray-600"> — &ldquo;{p.comment}&rdquo;</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!expired && committed === null && (
                  <div className="mt-3">
                    {showCommentFor === idx ? (
                      <div className="space-y-2">
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Optional note (e.g. let's pack snacks)"
                          maxLength={500}
                          rows={2}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setShowCommentFor(null); setComment('') }}
                            className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleVote(idx)}
                            disabled={voting === idx}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {voting === idx ? 'Sending…' : 'Send pick'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setShowCommentFor(idx)}
                          className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
                        >
                          Add a note
                        </button>
                        <button
                          onClick={() => handleVote(idx)}
                          disabled={voting !== null}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {voting === idx ? 'Sending…' : `Pick option ${idx + 1}`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ExploreNearbyLink options={initial.options} />

      <footer className="mt-10 text-center text-xs text-gray-400">
        Powered by{' '}
        <Link href="/" className="underline hover:text-gray-600">
          Seattle Family Bucket List
        </Link>
      </footer>
    </div>
  )
}
