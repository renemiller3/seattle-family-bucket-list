'use client'

import { getVibeEmoji } from '@/lib/utils'
import type { Vibe } from '@/lib/types'

const ALL_VIBES: Vibe[] = [
  'Chill / Easy',
  'Burn Energy',
  'Outdoor / Nature',
  'Rainy Day',
  'Special / Treat',
  'Animals',
  'Transportation',
]

interface VibeButtonsProps {
  selected: Vibe[]
  onToggle: (vibe: Vibe) => void
}

export default function VibeButtons({ selected, onToggle }: VibeButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_VIBES.map((vibe) => {
        const isActive = selected.includes(vibe)
        return (
          <button
            key={vibe}
            onClick={() => onToggle(vibe)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              isActive
                ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500'
                : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 hover:ring-gray-300'
            }`}
          >
            <span>{getVibeEmoji(vibe)}</span>
            {vibe}
          </button>
        )
      })}
    </div>
  )
}
