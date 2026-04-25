'use client'

import Link from 'next/link'
import type { RecommendationOption } from '@/app/plan/actions'

interface Props {
  options: RecommendationOption[]
  onClose?: () => void
}

function dominantArea(options: RecommendationOption[]): string | null {
  const counts = new Map<string, number>()
  for (const opt of options) {
    const area = opt.anchor_activity?.area
    if (!area) continue
    counts.set(area, (counts.get(area) ?? 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] ?? null
}

export default function ExploreNearbyLink({ options, onClose }: Props) {
  const area = dominantArea(options)
  const href = area ? `/?area=${encodeURIComponent(area)}` : '/'
  const label = area ? `Explore other activities in ${area}` : 'Explore other nearby activities'
  return (
    <div className="mt-2 text-center">
      <Link
        href={href}
        onClick={onClose}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
      >
        {label}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  )
}
