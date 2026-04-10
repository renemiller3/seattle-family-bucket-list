'use client'

import type { AgeRange, Area, Cost, Vibe, ActivityType } from '@/lib/types'

export interface Filters {
  vibes: Vibe[]
  ageRange: AgeRange | null
  area: Area | null
  cost: Cost | null
  type: ActivityType | null
}

interface FilterBarProps {
  filters: Filters
  onChange: (filters: Filters) => void
}

const AGE_RANGES: AgeRange[] = ['All Ages', 'Toddler', '3-5', '5+', '8+', '12+']
const AREAS: Area[] = ['Seattle', 'Eastside', 'North', 'South', 'Tacoma', 'Beyond Seattle / PNW']
const COSTS: Cost[] = ['Free', '$', '$$', '$$$']

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

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const hasFilters = filters.ageRange || filters.area || filters.cost || filters.type || filters.vibes.length > 0

  return (
    <div className="flex flex-wrap items-center gap-3">
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
      {hasFilters && (
        <button
          onClick={() =>
            onChange({ vibes: [], ageRange: null, area: null, cost: null, type: null })
          }
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
