'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  generateDayRecommendations,
  commitRecommendation,
  type RecommendationResult,
  type RecommendationOption,
} from '@/app/plan/actions'

interface PlanMyDayModalProps {
  initialDate: string
  onClose: () => void
  onCommitted: (outingId: string) => void
}

type Step = 'pick' | 'loading' | 'results' | 'committing'

export default function PlanMyDayModal({ initialDate, onClose, onCommitted }: PlanMyDayModalProps) {
  const [step, setStep] = useState<Step>('pick')
  const [date, setDate] = useState(initialDate)
  const [result, setResult] = useState<RecommendationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [committingIdx, setCommittingIdx] = useState<number | null>(null)

  const handleGenerate = async () => {
    setError(null)
    setStep('loading')
    let response
    try {
      response = await generateDayRecommendations(date)
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

  const handleCommit = async (option: RecommendationOption, idx: number) => {
    setError(null)
    setCommittingIdx(idx)
    setStep('committing')
    let response
    try {
      response = await commitRecommendation(option, date)
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
            <p className="text-xs text-gray-500">Three concierge-picked outings, fully planned.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {step === 'pick' && (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Which day?</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>
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
              <ResultsHeader result={result} />
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <div className="space-y-4">
                {result.options.map((option, idx) => (
                  <OptionCard
                    key={idx}
                    option={option}
                    onCommit={() => handleCommit(option, idx)}
                    isCommitting={step === 'committing' && committingIdx === idx}
                    disabled={step === 'committing'}
                  />
                ))}
              </div>
              <div className="flex justify-between">
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
            </div>
          )}
        </div>
      </div>
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

function OptionCard({
  option,
  onCommit,
  isCommitting,
  disabled,
}: {
  option: RecommendationOption
  onCommit: () => void
  isCommitting: boolean
  disabled: boolean
}) {
  const vibeColor = {
    'Chill / Easy': 'bg-sky-50 text-sky-700 border-sky-200',
    'Burn Energy': 'bg-orange-50 text-orange-700 border-orange-200',
    'Special / Treat': 'bg-violet-50 text-violet-700 border-violet-200',
  }[option.vibe_label] ?? 'bg-gray-50 text-gray-700 border-gray-200'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
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
          <div>{option.total_drive_time_minutes} min driving</div>
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

      {option.food_stop && (
        <div className="mt-2 text-xs text-gray-600">
          🍽 <span className="font-medium">{option.food_stop.name}</span> ({option.food_stop.vicinity}) — {option.food_stop.why}
        </div>
      )}

      <p className="mt-3 text-xs italic text-gray-500">{option.why_today}</p>

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
  )
}
