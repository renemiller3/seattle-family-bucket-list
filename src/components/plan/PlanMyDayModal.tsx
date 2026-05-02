'use client'

import { useState } from 'react'
import { format, addDays } from 'date-fns'
import {
  generateDayRecommendations,
  commitRecommendation,
  type RecommendationResult,
  type RecommendationOption,
  type RecommendationPick,
  type RecommendationPin,
} from '@/app/plan/actions'
import ShareRecommendationsModal from './ShareRecommendationsModal'
import ExploreNearbyLink from './ExploreNearbyLink'
import PinPicker, { type PinDisplay } from './PinPicker'

interface PlanMyDayModalProps {
  initialDate: string
  onClose: () => void
  onCommitted: (outingId: string) => void
  // Optional: open the modal in "results" mode rehydrated from a previously shared snapshot.
  initialResult?: RecommendationResult
  sharedRecommendationId?: string
  picks?: RecommendationPick[]
  shareSlug?: string
}

type Step = 'pick' | 'loading' | 'results' | 'committing'

export default function PlanMyDayModal({
  initialDate,
  onClose,
  onCommitted,
  initialResult,
  sharedRecommendationId,
  picks,
  shareSlug,
}: PlanMyDayModalProps) {
  const [step, setStep] = useState<Step>(initialResult ? 'results' : 'pick')
  const [date, setDate] = useState(initialResult?.date ?? initialDate)
  const [result, setResult] = useState<RecommendationResult | null>(initialResult ?? null)
  const [error, setError] = useState<string | null>(null)
  const [committingIdx, setCommittingIdx] = useState<number | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [pins, setPins] = useState<RecommendationPin[]>([])
  const [pinDisplays, setPinDisplays] = useState<PinDisplay[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleGenerate = async () => {
    setError(null)
    setStep('loading')
    let response
    try {
      response = await generateDayRecommendations(date, pins)
    } catch {
      setError("Something went wrong reaching the server. Please try again.")
      setStep('pick')
      return
    }
    if (!response.ok) {
      setError(response.error)
      setStep('pick')
      return
    }
    setResult(response.data)
    setStep('results')
  }

  const handleAddPin = (pin: RecommendationPin, display: PinDisplay) => {
    if (pins.length >= 2) return
    setPins((prev) => [...prev, pin])
    setPinDisplays((prev) => [...prev, display])
  }

  const handleRemovePin = (key: string) => {
    const idx = pinDisplays.findIndex((p) => p.key === key)
    if (idx < 0) return
    setPins((prev) => prev.filter((_, i) => i !== idx))
    setPinDisplays((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleCommit = async (option: RecommendationOption, idx: number) => {
    setError(null)
    setCommittingIdx(idx)
    setStep('committing')
    let response
    try {
      response = await commitRecommendation(option, date, sharedRecommendationId, idx)
    } catch {
      setError("Something went wrong reaching the server. Please try again.")
      setStep('results')
      setCommittingIdx(null)
      return
    }
    if (!response.ok) {
      setError(response.error)
      setStep('results')
      setCommittingIdx(null)
      return
    }
    onCommitted(response.outing_id)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">✨ Plan my day</h2>
            <p className="text-xs text-gray-500">Pick a vibe. Get a plan. Go play.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {step === 'pick' && (
            <div className="space-y-4">
              <div>
                <span className="mb-2 block text-sm font-medium text-gray-700">Which day?</span>
                <QuickDateButtons selected={date} onSelect={setDate} />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  Want to include something specific? <span className="font-normal text-gray-500">(optional, up to 2)</span>
                </span>
                {pinDisplays.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {pinDisplays.map((p) => (
                      <span
                        key={p.key}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                          p.kind === 'activity'
                            ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                            : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                        }`}
                      >
                        {p.kind === 'idea' ? '💡' : '📌'} {p.emoji ? `${p.emoji} ` : ''}{p.label}
                        <button
                          onClick={() => handleRemovePin(p.key)}
                          className="ml-0.5 rounded-full hover:bg-black/10"
                          aria-label="Remove"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {pinDisplays.length < 2 && (
                  <button
                    onClick={() => setPickerOpen(true)}
                    className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    + Add something I want to do
                  </button>
                )}
              </div>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <div className="flex justify-end">
                <button
                  onClick={handleGenerate}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                >
                  Generate 3 options
                </button>
              </div>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-600" />
              <p className="text-sm text-gray-600">Pulling the forecast and planning three outings…</p>
            </div>
          )}

          {(step === 'results' || step === 'committing') && result && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <ResultsHeader result={result} />
                </div>
                <button
                  onClick={() => setShareOpen(true)}
                  disabled={step === 'committing'}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  Share
                </button>
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <div className="space-y-4">
                {result.options.map((option, idx) => (
                  <OptionCard
                    key={idx}
                    option={option}
                    optionIndex={idx}
                    picks={picks}
                    onCommit={() => handleCommit(option, idx)}
                    isCommitting={step === 'committing' && committingIdx === idx}
                    disabled={step === 'committing'}
                  />
                ))}
              </div>
              <ExploreNearbyLink options={result.options} onClose={onClose} />
              {(!initialResult) && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => { setResult(null); setStep('pick') }}
                    disabled={step === 'committing'}
                    className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    ← Pick a different day
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={step === 'committing'}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {shareOpen && result && (
        <ShareRecommendationsModal
          date={date}
          weather={result.weather}
          options={result.options}
          existingShareUrl={shareSlug ? `${window.location.origin}/share/${shareSlug}` : undefined}
          onClose={() => setShareOpen(false)}
        />
      )}

      {pickerOpen && (
        <PinPicker
          pinned={pinDisplays}
          onAdd={handleAddPin}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}

function QuickDateButtons({ selected, onSelect }: { selected: string; onSelect: (date: string) => void }) {
  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd')
  const dayOfWeek = now.getDay() // 0=Sun, 6=Sat
  const daysUntilSat = dayOfWeek === 6 ? 7 : 6 - dayOfWeek
  const nextSaturdayStr = format(addDays(now, daysUntilSat), 'yyyy-MM-dd')

  const options = [
    { label: 'Today', value: todayStr },
    { label: 'Tomorrow', value: tomorrowStr },
    { label: 'Next Weekend', value: nextSaturdayStr },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ label, value }) => (
        <button
          key={label}
          onClick={() => onSelect(value)}
          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
            selected === value
              ? 'border-emerald-500 bg-emerald-50 font-medium text-emerald-700'
              : 'border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-600'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function ResultsHeader({ result }: { result: RecommendationResult }) {
  const dateLabel = format(new Date(result.date + 'T00:00:00'), 'EEEE, MMM d')
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
      <div className="font-semibold text-gray-900">{dateLabel}</div>
      {result.weather ? (
        <div className="text-xs text-gray-600">
          {result.weather.conditions} · {result.weather.temp_high_f}° / {result.weather.temp_low_f}° ·{' '}
          {result.weather.precipitation_chance}% precip
        </div>
      ) : (
        <div className="text-xs text-gray-500">Forecast not available — picks based on the season.</div>
      )}
    </div>
  )
}

function formatDriveTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min driving`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h} hr driving`
  return `${h} hr ${m} min driving`
}

function OptionCard({
  option,
  optionIndex,
  picks,
  onCommit,
  isCommitting,
  disabled,
}: {
  option: RecommendationOption
  optionIndex: number
  picks?: RecommendationPick[]
  onCommit: () => void
  isCommitting: boolean
  disabled: boolean
}) {
  const myPicks = picks?.filter((p) => p.option_index === optionIndex) ?? []
  const vibeColor = {
    'Chill / Easy': 'bg-sky-50 text-sky-700 border-sky-200',
    'Burn Energy': 'bg-orange-50 text-orange-700 border-orange-200',
    'Special / Treat': 'bg-violet-50 text-violet-700 border-violet-200',
  }[option.vibe_label] ?? 'bg-gray-50 text-gray-700 border-gray-200'

  const imageUrl = option.anchor_activity.image_url

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={option.anchor_activity.title}
          className="h-40 w-full object-cover"
        />
      )}
      <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${vibeColor}`}>
            {option.vibe_label}
          </span>
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

      {myPicks.length > 0 && (
        <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2">
          <div className="text-xs font-medium uppercase tracking-wide text-rose-600">Picked by</div>
          <ul className="mt-1 space-y-1">
            {myPicks.map((p) => (
              <li key={p.id} className="text-sm text-gray-700">
                <span className="mr-1">❤️</span>
                <span className="font-medium">{p.voter_name}</span>
                {p.comment && <span className="text-gray-600"> — &ldquo;{p.comment}&rdquo;</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button
          onClick={onCommit}
          disabled={disabled}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {isCommitting ? 'Creating outing…' : 'Make this my day'}
        </button>
      </div>
      </div>
    </div>
  )
}
