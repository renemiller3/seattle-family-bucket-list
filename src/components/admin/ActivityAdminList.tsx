'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Activity } from '@/lib/types'
import { deleteActivity } from '@/app/admin/actions'

type SortKey = 'title' | 'area' | 'cost' | 'type'

const SORT_LABELS: Record<SortKey, string> = {
  title: 'Title',
  area: 'Area',
  cost: 'Cost',
  type: 'Type',
}

export default function ActivityAdminList({ activities }: { activities: Activity[] }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletedTitle, setDeletedTitle] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? activities.filter((a) => a.title.toLowerCase().includes(q))
      : activities
    const sorted = [...filtered].sort((a, b) => {
      const av = String(a[sortKey] ?? '').toLowerCase()
      const bv = String(b[sortKey] ?? '').toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [activities, search, sortKey, sortDir])

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  const onDelete = (id: string) => {
    const title = activities.find((a) => a.id === id)?.title ?? 'Activity'
    startTransition(async () => {
      try {
        await deleteActivity(id)
        setConfirmId(null)
        setDeletedTitle(title)
        setTimeout(() => setDeletedTitle(null), 3000)
        router.refresh()
      } catch (e) {
        alert('Failed to delete: ' + (e as Error).message)
        setConfirmId(null)
      }
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
        <Link
          href="/admin/activities/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + New Activity
        </Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:max-w-sm"
        />
        <div className="mt-2 text-xs text-gray-500">{visible.length} of {activities.length}</div>
      </div>

      {deletedTitle && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Deleted <strong>{deletedTitle}</strong>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {(['title', 'area', 'cost', 'type'] as SortKey[]).map((k) => (
                <th
                  key={k}
                  onClick={() => toggleSort(k)}
                  className="cursor-pointer px-4 py-2 text-left font-medium text-gray-700 hover:bg-gray-100"
                >
                  {SORT_LABELS[k]}
                  {sortKey === k && <span className="ml-1 text-gray-400">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
              <th className="px-4 py-2 text-left font-medium text-gray-700">Featured</th>
              <th className="px-4 py-2 text-right font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => (
              <tr
                key={a.id}
                className={`border-t border-gray-100 ${confirmId === a.id ? 'bg-red-50' : 'hover:bg-gray-50'}`}
              >
                {confirmId === a.id ? (
                  <td colSpan={6} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-red-900">
                        Really delete <strong>{a.title}</strong>? This cannot be undone.
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onDelete(a.id)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="rounded-lg bg-white border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <Link href={`/activities/${a.id}`} className="font-medium text-gray-900 hover:text-emerald-700 hover:underline">
                        {a.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.area}</td>
                    <td className="px-4 py-3 text-gray-600">{a.cost}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs ${a.type === 'event' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {a.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.featured ? '★' : ''}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/activities/${a.id}`}
                        className="mr-3 text-sm font-medium text-emerald-700 hover:text-emerald-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setConfirmId(a.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No activities match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
