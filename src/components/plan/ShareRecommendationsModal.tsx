'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useCrew } from '@/hooks/useCrew'
import { createSharedRecommendation } from '@/app/plan/actions'
import type { RecommendationOption } from '@/app/plan/actions'
import type { DailyWeather } from '@/lib/weather'
import type { CrewMember } from '@/lib/types'

interface ShareRecommendationsModalProps {
  date: string
  weather: DailyWeather | null
  options: RecommendationOption[]
  onClose: () => void
}

const DEFAULT_MESSAGE = "Help me pick our day — which one looks best?"

export default function ShareRecommendationsModal({
  date,
  weather,
  options,
  onClose,
}: ShareRecommendationsModalProps) {
  const { user } = useAuth()
  const { crew, loading: crewLoading } = useCrew(user?.id)
  const [creating, setCreating] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Lazily create the shared link when the modal opens (one snapshot per modal session).
  useEffect(() => {
    let cancelled = false
    setCreating(true)
    createSharedRecommendation(date, weather, options).then((res) => {
      if (cancelled) return
      if (res.ok) {
        setShareUrl(`${window.location.origin}/share/${res.slug}`)
      } else {
        setError(res.error)
      }
      setCreating(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      // execCommand fallback works on iOS Safari after click; modern path tries clipboard first.
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const el = document.createElement('textarea')
      el.value = shareUrl
      el.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendToCrew = (member: CrewMember) => {
    if (!shareUrl) return
    const body = `${DEFAULT_MESSAGE}\n\n${shareUrl}`
    if (member.phone) {
      // sms:?body= works on iOS; sms:?&body= works on Android — using ?& covers both.
      const phone = member.phone.replace(/[^\d+]/g, '')
      const url = `sms:${phone}${/Android/i.test(navigator.userAgent) ? '?' : '&'}body=${encodeURIComponent(body)}`
      window.location.href = url
    } else if (member.email) {
      const subject = "Help me pick our day"
      const url = `mailto:${encodeURIComponent(member.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.location.href = url
    } else {
      // No contact info — just copy and tell user
      handleCopy()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="my-12 w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Share these options</h2>
            <p className="text-xs text-gray-500">They&rsquo;ll be able to vote — no sign-in needed.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {creating && !error && (
            <div className="flex items-center gap-3 py-3 text-sm text-gray-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-600" />
              Creating your share link…
            </div>
          )}

          {shareUrl && !creating && (
            <>
              {crew.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Quick send
                  </p>
                  <div className="space-y-1.5">
                    {crew.map((member) => {
                      const sub = member.phone ?? member.email ?? 'Copy & send manually'
                      return (
                        <button
                          key={member.id}
                          onClick={() => handleSendToCrew(member)}
                          className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-gray-900">{member.name}</div>
                            <div className="truncate text-xs text-gray-500">{sub}</div>
                          </div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-gray-400">
                            <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
                          </svg>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {crew.length === 0 && !crewLoading && (
                <div className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-sm text-gray-500">
                  Tip: add people you plan with often (spouse, friends) under{' '}
                  <Link href="/settings" onClick={onClose} className="text-emerald-700 underline">
                    Settings → Crew
                  </Link>{' '}
                  for one-tap sharing.
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Anyone else
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700"
                  />
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-gray-400">
                The link works for anyone. Votes show up on this page when you come back.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
