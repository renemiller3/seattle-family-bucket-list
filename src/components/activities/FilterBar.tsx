'use client'

import type { AgeRange, Area, Cost, Vibe, ActivityType, PregnancyFriendly, CrowdLevel } from '@/lib/types'
import { getVibeEmoji } from '@/lib/utils'

export interface Filters {
  vibes: Vibe[]
  ageRange: AgeRange | null
  area: Area | null
  cost: Cost | null
  type: ActivityType | null
  pregnancyFriendly: PregnancyFriendly | null
  crowdLevel: CrowdLevel | null
}

interface FilterBarProps {
  filters: Filters
  onChange: (filters: Filters) => void
  compact?: boolean
}

const ALL_VIBES: Vibe[] = ['Chill / Easy', 'Burn Energy', 'Outdoor / Nature', 'Rainy Day', 'Special / Treat', 'Animals', 'Transportation']
const AGE_RANGES: AgeRange[] = ['All Ages', 'Toddler', '3-5', '5+', '8+', '12+']
const AREAS: Area[] = ['Seattle', 'Eastside', 'North', 'South', 'Tacoma', 'Wider PNW']
const COSTS: Cost[] = ['Free', '$', '$$', '$$$']
const PREGNANCY_OPTIONS: PregnancyFriendly[] = ['1st trimester', '2nd trimester', '3rd trimester']
const CROWD_OPTIONS: CrowdLevel[] = ['Usually quiet', 'Gets busy', 'Very busy']

function SelectFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T | null
  options: T[]
  onChange: (val: T | null) => void
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? (e.target.value as T) : null)}
      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}

const EMPTY_FILTERS: Filters = {
  vibes: [],
  ageRange: null,
  area: null,
  cost: null,
  type: null,
  pregnancyFriendly: null,
  crowdLevel: null,
}

export default function FilterBar({ filters, onChange, compact }: FilterBarProps) {
  const hasFilters =
    filters.ageRange || filters.area || filters.cost || filters.type ||
    filters.vibes.length > 0 || filters.pregnancyFriendly || filters.crowdLevel

  return (
    <div className="flex flex-wrap items-center gap-3">
      {compact && (
        <select
          value={filters.vibes[0] ?? ''}
          onChange={(e) => onChange({ ...filters, vibes: e.target.value ? [e.target.value as Vibe] : [] })}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Vibe</option>
          {ALL_VIBES.map((vibe) => (
            <option key={vibe} value={vibe}>{getVibeEmoji(vibe)} {vibe}</option>
          ))}
        </select>
      )}
      <SelectFilter
        label="Age Range"
        value={filters.ageRange}
        options={AGE_RANGES}
        onChange={(val) => onChange({ ...filters, ageRange: val })}
      />
      <SelectFilter
        label="Area"
        value={filters.area}
        options={AREAS}
        onChange={(val) => onChange({ ...filters, area: val })}
      />
      <SelectFilter
        label="Cost"
        value={filters.cost}
        options={COSTS}
        onChange={(val) => onChange({ ...filters, cost: val })}
      />
      <SelectFilter
        label="Type"
        value={filters.type}
        options={['activity', 'event'] as ActivityType[]}
        onChange={(val) => onChange({ ...filters, type: val })}
      />
      <SelectFilter
        label="Pregnancy Friendly"
        value={filters.pregnancyFriendly}
        options={PREGNANCY_OPTIONS}
        onChange={(val) => onChange({ ...filters, pregnancyFriendly: val })}
      />
      <SelectFilter
        label="Crowd Level"
        value={filters.crowdLevel}
        options={CROWD_OPTIONS}
        onChange={(val) => onChange({ ...filters, crowdLevel: val })}
      />
      {hasFilters && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
