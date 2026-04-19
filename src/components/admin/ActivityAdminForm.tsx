'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type {
  Activity, ActivityType, AgeRange, Area, Cost, Vibe,
  Recurrence, PregnancyFriendly, CrowdLevel, NearbyFood,
} from '@/lib/types'
import { createActivity, updateActivity, deleteActivity, type ActivityInput } from '@/app/admin/actions'

const AREAS: Area[] = ['Seattle', 'Eastside', 'North', 'South', 'Tacoma', 'Wider PNW']
const COSTS: Cost[] = ['Free', '$', '$$', '$$$']
const AGE_RANGES: AgeRange[] = ['All Ages', 'Toddler', '3-5', '5+', '8+', '12+']
const VIBES: Vibe[] = ['Chill / Easy', 'Burn Energy', 'Outdoor / Nature', 'Rainy Day', 'Special / Treat', 'Animals', 'Transportation']
const PREGNANCY: PregnancyFriendly[] = ['1st trimester', '2nd trimester', '3rd trimester']
const CROWD_LEVELS: CrowdLevel[] = ['Usually quiet', 'Gets busy', 'Very busy']
const RECURRENCES: Recurrence[] = ['one-time', 'seasonal', 'annual']
const SEASONS = ['spring', 'summer', 'fall', 'winter']

const EMPTY_INPUT: ActivityInput = {
  title: '',
  description: '',
  location_text: '',
  location_url: '',
  lat: null,
  lng: null,
  type: 'activity',
  age_range: [],
  area: 'Seattle',
  cost: 'Free',
  vibes: [],
  pregnancy_friendly: [],
  crowd_level: null,
  why_its_worth_it: '',
  what_to_watch_out_for: [],
  tips: null,
  nearby_food: [],
  start_date: null,
  end_date: null,
  recurrence: null,
  image_url: null,
  video_url: null,
  website_url: null,
  featured: false,
  seasons: [],
}

function toInput(a: Activity): ActivityInput {
  return {
    title: a.title,
    description: a.description,
    location_text: a.location_text,
    location_url: a.location_url,
    lat: a.lat,
    lng: a.lng,
    type: a.type,
    age_range: a.age_range ?? [],
    area: a.area,
    cost: a.cost,
    vibes: a.vibes ?? [],
    pregnancy_friendly: a.pregnancy_friendly ?? [],
    crowd_level: a.crowd_level,
    why_its_worth_it: a.why_its_worth_it,
    what_to_watch_out_for: a.what_to_watch_out_for ?? [],
    tips: a.tips,
    nearby_food: a.nearby_food ?? [],
    start_date: a.start_date,
    end_date: a.end_date,
    recurrence: a.recurrence,
    image_url: a.image_url,
    video_url: a.video_url,
    website_url: a.website_url,
    featured: a.featured,
    seasons: a.seasons ?? [],
  }
}

interface Props {
  activity?: Activity
}

export default function ActivityAdminForm({ activity }: Props) {
  const router = useRouter()
  const isEdit = !!activity
  const [form, setForm] = useState<ActivityInput>(() => activity ? toInput(activity) : EMPTY_INPUT)
  const [dirty, setDirty] = useState(false)
  const [submitting, startSubmit] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const update = <K extends keyof ActivityInput>(key: K, value: ActivityInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
  }

  const toggleArrayItem = <T extends string>(key: keyof ActivityInput, value: T) => {
    setForm((f) => {
      const arr = (f[key] as unknown as T[]) ?? []
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
      return { ...f, [key]: next }
    })
    setDirty(true)
  }

  const runGeocode = async (url: string) => {
    if (!url.trim()) { setGeoStatus('idle'); return }
    setGeoStatus('loading')
    try {
      const res = await fetch(`/api/admin/geocode?url=${encodeURIComponent(url)}`)
      if (!res.ok) { setGeoStatus('error'); return }
      const { lat, lng } = await res.json()
      setForm((f) => ({ ...f, lat, lng }))
      setDirty(true)
      setGeoStatus('ok')
    } catch {
      setGeoStatus('error')
    }
  }

  const onSubmit = () => {
    setError(null)
    startSubmit(async () => {
      try {
        if (isEdit && activity) {
          await updateActivity(activity.id, form)
          setDirty(false)
          router.push('/admin')
          router.refresh()
        } else {
          await createActivity(form)
          setDirty(false)
          router.push('/admin')
          router.refresh()
        }
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  const onDelete = () => {
    if (!activity) return
    startDelete(async () => {
      try {
        setDirty(false)
        await deleteActivity(activity.id)
      } catch (e) {
        setError((e as Error).message)
        setConfirmDelete(false)
      }
    })
  }

  const onCancel = () => {
    if (dirty && !confirm('Discard unsaved changes?')) return
    router.push('/admin')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="sticky top-16 z-40 -mx-4 mb-6 flex items-center justify-between gap-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <h1 className="truncate text-lg font-bold text-gray-900">
          {isEdit ? form.title || activity!.title : 'New Activity'}
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting || deleting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || deleting}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <Field label="Title">
          <TextInput value={form.title} onChange={(v) => update('title', v)} />
        </Field>

        <Field label="Description">
          <TextArea value={form.description} onChange={(v) => update('description', v)} rows={3} />
        </Field>

        <Field label="Type">
          <RadioGroup
            options={['activity', 'event'] as ActivityType[]}
            value={form.type}
            onChange={(v) => update('type', v)}
          />
        </Field>

        <Field label="Area">
          <select
            value={form.area}
            onChange={(e) => update('area', e.target.value as Area)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>

        <Field label="Cost">
          <RadioGroup options={COSTS} value={form.cost} onChange={(v) => update('cost', v)} />
        </Field>

        <Field label="Featured">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => update('featured', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">Show on featured row</span>
          </label>
        </Field>

        <Field label="Location text">
          <TextInput value={form.location_text} onChange={(v) => update('location_text', v)} />
        </Field>

        <Field label="Google Maps URL">
          <TextInput
            value={form.location_url}
            onChange={(v) => update('location_url', v)}
            onBlur={() => runGeocode(form.location_url)}
            placeholder="https://maps.google.com/..."
          />
          <div className="mt-1 text-xs">
            {geoStatus === 'loading' && <span className="text-gray-500">Looking up coordinates...</span>}
            {geoStatus === 'error' && <span className="text-red-600">Could not extract coordinates — you can save anyway and fix later.</span>}
            {form.lat != null && form.lng != null && geoStatus !== 'error' && (
              <span className="text-gray-500">Lat {form.lat.toFixed(5)}, Lng {form.lng.toFixed(5)}</span>
            )}
          </div>
        </Field>

        <Field label="Age range">
          <CheckboxGroup
            options={AGE_RANGES}
            selected={form.age_range}
            onToggle={(v) => toggleArrayItem('age_range', v)}
          />
        </Field>

        <Field label="Vibes">
          <CheckboxGroup
            options={VIBES}
            selected={form.vibes}
            onToggle={(v) => toggleArrayItem('vibes', v)}
          />
        </Field>

        <Field label="Crowd level">
          <RadioGroup
            options={['', ...CROWD_LEVELS]}
            value={form.crowd_level ?? ''}
            onChange={(v) => update('crowd_level', (v || null) as CrowdLevel | null)}
            labels={{ '': 'Not set' }}
          />
        </Field>

        <Field label="Pregnancy friendly">
          <CheckboxGroup
            options={PREGNANCY}
            selected={form.pregnancy_friendly}
            onToggle={(v) => toggleArrayItem('pregnancy_friendly', v)}
          />
        </Field>

        <Field label="Recurrence">
          <RadioGroup
            options={['', ...RECURRENCES]}
            value={form.recurrence ?? ''}
            onChange={(v) => update('recurrence', (v || null) as Recurrence | null)}
            labels={{ '': 'None' }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date">
            <input
              type="date"
              value={form.start_date ?? ''}
              onChange={(e) => update('start_date', e.target.value || null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              value={form.end_date ?? ''}
              onChange={(e) => update('end_date', e.target.value || null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </Field>
        </div>

        <Field label="Seasons">
          <CheckboxGroup
            options={SEASONS}
            selected={form.seasons}
            onToggle={(v) => toggleArrayItem('seasons', v)}
          />
        </Field>

        <Field label="Why it's worth it">
          <TextArea value={form.why_its_worth_it} onChange={(v) => update('why_its_worth_it', v)} rows={3} />
        </Field>

        <Field label="What to watch out for">
          <DynamicList
            items={form.what_to_watch_out_for}
            onChange={(v) => update('what_to_watch_out_for', v)}
            placeholder="Add a thing to watch out for..."
          />
        </Field>

        <Field label="Tips">
          <TextArea
            value={form.tips ?? ''}
            onChange={(v) => update('tips', v || null)}
            rows={2}
          />
        </Field>

        <Field label="Nearby food">
          <NearbyFoodList
            items={form.nearby_food}
            onChange={(v) => update('nearby_food', v)}
          />
        </Field>

        <Field label="Image URL">
          <TextInput
            value={form.image_url ?? ''}
            onChange={(v) => update('image_url', v || null)}
            placeholder="https://..."
          />
          {form.image_url && (
            <img
              src={form.image_url}
              alt="Preview"
              className="mt-2 h-32 w-auto rounded-lg border border-gray-200 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </Field>

        <Field label="Video URL">
          <TextInput
            value={form.video_url ?? ''}
            onChange={(v) => update('video_url', v || null)}
            placeholder="https://..."
          />
        </Field>

        <Field label="Website URL">
          <TextInput
            value={form.website_url ?? ''}
            onChange={(v) => update('website_url', v || null)}
            placeholder="https://..."
          />
        </Field>

        {isEdit && (
          <div className="mt-12 border-t border-gray-200 pt-6">
            {confirmDelete ? (
              <div className="flex items-center justify-between gap-4 rounded-lg bg-red-50 p-4">
                <span className="text-sm text-red-900">
                  Delete <strong>{activity!.title}</strong>? This cannot be undone.
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={onDelete}
                    disabled={deleting}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                Delete this activity
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

function TextInput({
  value, onChange, onBlur, placeholder,
}: {
  value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    />
  )
}

function TextArea({
  value, onChange, rows,
}: {
  value: string; onChange: (v: string) => void; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows ?? 3}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    />
  )
}

function RadioGroup<T extends string>({
  options, value, onChange, labels,
}: {
  options: readonly T[]; value: T; onChange: (v: T) => void; labels?: Partial<Record<T, string>>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${
            value === opt
              ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="sr-only"
          />
          {labels?.[opt] ?? opt ?? '—'}
        </label>
      ))}
    </div>
  )
}

function CheckboxGroup<T extends string>({
  options, selected, onToggle,
}: {
  options: readonly T[]; selected: T[]; onToggle: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt)
        return (
          <label
            key={opt}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${
              active
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              checked={active}
              onChange={() => onToggle(opt)}
              className="sr-only"
            />
            {opt}
          </label>
        )
      })}
    </div>
  )
}

function DynamicList({
  items, onChange, placeholder,
}: {
  items: string[]; onChange: (v: string[]) => void; placeholder?: string
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const next = [...items]
              next[i] = e.target.value
              onChange(next)
            }}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-700"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
      >
        + Add
      </button>
      {placeholder && items.length === 0 && (
        <div className="text-xs text-gray-400">{placeholder}</div>
      )}
    </div>
  )
}

function NearbyFoodList({
  items, onChange,
}: {
  items: NearbyFood[]; onChange: (v: NearbyFood[]) => void
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={item.name}
            placeholder="Name"
            onChange={(e) => {
              const next = [...items]
              next[i] = { ...next[i], name: e.target.value }
              onChange(next)
            }}
            className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <input
            type="text"
            value={item.description}
            placeholder="Description"
            onChange={(e) => {
              const next = [...items]
              next[i] = { ...next[i], description: e.target.value }
              onChange(next)
            }}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-700"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { name: '', description: '' }])}
        className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
      >
        + Add nearby food
      </button>
    </div>
  )
}
