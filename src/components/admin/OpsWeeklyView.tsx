'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  toggleRecurringCompletion,
  addWeeklyTask,
  toggleWeeklyTask,
  deleteWeeklyTask,
  addRecurringTask,
  updateRecurringTask,
  deleteRecurringTask,
  setRecurringTaskActive,
  moveRecurringTask,
} from '@/app/admin/ops/actions'
import type { OpsRecurringTask, OpsWeeklyTask } from '@/lib/types'

interface Props {
  recurringTasks: OpsRecurringTask[]
  completedIds: string[]
  weeklyTasks: OpsWeeklyTask[]
  weekStarting: string        // YYYY-MM-DD Monday
  isCurrentWeek: boolean
  prevWeek: string
  nextWeek: string
  canGoNext: boolean
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

function formatWeekRange(monday: string): string {
  const start = new Date(monday + 'T12:00:00')
  const end = new Date(monday + 'T12:00:00')
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
}

// ─── Recurring task row ───────────────────────────────────────────────────────

function RecurringRow({
  task,
  done,
  weekStarting,
  isManaging,
  isFirst,
  isLast,
}: {
  task: OpsRecurringTask
  done: boolean
  weekStarting: string
  isManaging: boolean
  isFirst: boolean
  isLast: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editNotes, setEditNotes] = useState(task.notes ?? '')
  const [editDay, setEditDay] = useState(task.day_of_week ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function handleToggle() {
    startTransition(() => toggleRecurringCompletion(task.id, weekStarting))
  }

  function handleSaveEdit() {
    if (!editTitle.trim()) return
    startTransition(async () => {
      await updateRecurringTask(task.id, {
        title: editTitle.trim(),
        notes: editNotes.trim() || null,
        day_of_week: editDay || null,
      })
      setEditing(false)
    })
  }

  function handleDelete() {
    if (!confirm(`Delete "${task.title}"? This will also remove all completion history.`)) return
    startTransition(() => deleteRecurringTask(task.id))
  }

  function handleToggleActive() {
    startTransition(() => setRecurringTaskActive(task.id, !task.is_active))
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3">
        <input
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditing(false) }}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="Task title"
        />
        <input
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          className="mt-1.5 w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:outline-none"
          placeholder="Notes (optional)"
        />
        <div className="mt-1.5 flex items-center gap-2">
          <select
            value={editDay}
            onChange={(e) => setEditDay(e.target.value)}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600"
          >
            <option value="">Any day</option>
            {Object.entries(DAY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button onClick={handleSaveEdit} disabled={isPending} className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            Save
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50 ${!task.is_active ? 'opacity-40' : ''}`}>
      {/* Checkbox — only clickable in the weekly view (not manage mode) */}
      {!isManaging ? (
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors disabled:opacity-50 ${
            done
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-gray-300 hover:border-emerald-400'
          }`}
        >
          {done && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" />
            </svg>
          )}
        </button>
      ) : (
        /* Reorder arrows in manage mode */
        <div className="flex flex-shrink-0 flex-col gap-0.5">
          <button
            onClick={() => startTransition(() => moveRecurringTask(task.id, 'up'))}
            disabled={isPending || isFirst}
            className="rounded px-1 text-gray-300 hover:text-gray-600 disabled:opacity-20"
            title="Move up"
          >
            ▲
          </button>
          <button
            onClick={() => startTransition(() => moveRecurringTask(task.id, 'down'))}
            disabled={isPending || isLast}
            className="rounded px-1 text-gray-300 hover:text-gray-600 disabled:opacity-20"
            title="Move down"
          >
            ▼
          </button>
        </div>
      )}

      {/* Title + metadata */}
      <div className="min-w-0 flex-1">
        <p className={`text-sm text-gray-900 ${done && !isManaging ? 'line-through text-gray-400' : ''}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2">
          {task.notes && <p className="text-xs text-gray-400">{task.notes}</p>}
          {task.day_of_week && (
            <span className="text-xs text-gray-400">{DAY_LABELS[task.day_of_week]}</span>
          )}
        </div>
      </div>

      {/* Manage-mode controls */}
      {isManaging && (
        <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => setEditing(true)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Edit"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={handleToggleActive}
            disabled={isPending}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title={task.is_active ? 'Pause' : 'Activate'}
          >
            {task.is_active ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
            title="Delete"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Weekly task row ──────────────────────────────────────────────────────────

function WeeklyRow({ task }: { task: OpsWeeklyTask }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">
      <button
        onClick={() => startTransition(() => toggleWeeklyTask(task.id, !task.is_done))}
        disabled={isPending}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors disabled:opacity-50 ${
          task.is_done
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-gray-300 hover:border-emerald-400'
        }`}
      >
        {task.is_done && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" />
          </svg>
        )}
      </button>
      <p className={`flex-1 text-sm text-gray-900 ${task.is_done ? 'line-through text-gray-400' : ''}`}>
        {task.title}
      </p>
      <button
        onClick={() => startTransition(() => deleteWeeklyTask(task.id))}
        disabled={isPending}
        className="flex-shrink-0 rounded p-1 text-gray-300 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
        title="Remove"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── Add recurring task form ──────────────────────────────────────────────────

function AddRecurringForm({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [day, setDay] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleSubmit() {
    if (!title.trim()) return
    startTransition(async () => {
      await addRecurringTask(title.trim(), notes.trim() || undefined, day || undefined)
      setTitle('')
      setNotes('')
      setDay('')
      onDone()
    })
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onDone() }}
        className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        placeholder="Task title (be specific)"
      />
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="mt-1.5 w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:outline-none"
        placeholder="Notes (optional)"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600"
        >
          <option value="">Any day this week</option>
          {Object.entries(DAY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button
          onClick={handleSubmit}
          disabled={isPending || !title.trim()}
          className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Add
        </button>
        <button onClick={onDone} className="text-xs text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OpsWeeklyView({
  recurringTasks,
  completedIds,
  weeklyTasks,
  weekStarting,
  isCurrentWeek,
  prevWeek,
  nextWeek,
  canGoNext,
}: Props) {
  const router = useRouter()
  const [isManaging, setIsManaging] = useState(false)
  const [showAddRecurring, setShowAddRecurring] = useState(false)
  const [addingWeekly, setAddingWeekly] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isPending, startTransition] = useTransition()
  const addInputRef = useRef<HTMLInputElement>(null)

  const completedSet = new Set(completedIds)
  const activeRecurring = recurringTasks.filter((t) => t.is_active || isManaging)
  const allRecurring = recurringTasks

  const recurringDone = recurringTasks.filter((t) => t.is_active && completedSet.has(t.id)).length
  const recurringTotal = recurringTasks.filter((t) => t.is_active).length
  const weeklyDone = weeklyTasks.filter((t) => t.is_done).length

  function handleAddWeeklySubmit() {
    if (!newTaskTitle.trim()) return
    startTransition(async () => {
      await addWeeklyTask(weekStarting, newTaskTitle.trim())
      setNewTaskTitle('')
      setAddingWeekly(false)
    })
  }

  useEffect(() => {
    if (addingWeekly) addInputRef.current?.focus()
  }, [addingWeekly])

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ops</h1>
          <p className="mt-0.5 text-sm text-gray-500">{formatWeekRange(weekStarting)}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push(`/admin/ops?week=${prevWeek}`)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            ←
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => router.push('/admin/ops')}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Today
            </button>
          )}
          <button
            onClick={() => canGoNext && router.push(`/admin/ops?week=${nextWeek}`)}
            disabled={!canGoNext}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>

      {/* ── Recurring section ── */}
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recurring</h2>
            {recurringTotal > 0 && (
              <span className={`text-xs font-medium ${recurringDone === recurringTotal ? 'text-emerald-600' : 'text-gray-400'}`}>
                {recurringDone}/{recurringTotal}
              </span>
            )}
          </div>
          <button
            onClick={() => { setIsManaging(!isManaging); setShowAddRecurring(false) }}
            className={`text-xs font-medium transition-colors ${isManaging ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {isManaging ? 'Done managing' : 'Manage'}
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          {(isManaging ? allRecurring : activeRecurring).length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              No recurring tasks yet. Click Manage to add some.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 px-2 py-1">
              {(isManaging ? allRecurring : activeRecurring).map((task, i) => (
                <RecurringRow
                  key={task.id}
                  task={task}
                  done={completedSet.has(task.id)}
                  weekStarting={weekStarting}
                  isManaging={isManaging}
                  isFirst={i === 0}
                  isLast={i === (isManaging ? allRecurring : activeRecurring).length - 1}
                />
              ))}
            </div>
          )}

          {/* Add recurring task form / button */}
          {isManaging && (
            <div className="border-t border-gray-100 px-2 py-2">
              {showAddRecurring ? (
                <AddRecurringForm onDone={() => setShowAddRecurring(false)} />
              ) : (
                <button
                  onClick={() => setShowAddRecurring(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                >
                  <span className="text-base leading-none">+</span> Add recurring task
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── This week section ── */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">This Week</h2>
            {weeklyTasks.length > 0 && (
              <span className={`text-xs font-medium ${weeklyDone === weeklyTasks.length ? 'text-emerald-600' : 'text-gray-400'}`}>
                {weeklyDone}/{weeklyTasks.length}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          {weeklyTasks.length === 0 && !addingWeekly ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              No tasks for this week yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 px-2 py-1">
              {weeklyTasks.map((task) => (
                <WeeklyRow key={task.id} task={task} />
              ))}
            </div>
          )}

          {/* Add weekly task */}
          <div className={`${weeklyTasks.length > 0 ? 'border-t border-gray-100' : ''} px-2 py-2`}>
            {addingWeekly ? (
              <div className="flex items-center gap-2">
                <input
                  ref={addInputRef}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddWeeklySubmit()
                    if (e.key === 'Escape') { setAddingWeekly(false); setNewTaskTitle('') }
                  }}
                  className="flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Task title"
                  disabled={isPending}
                />
                <button
                  onClick={handleAddWeeklySubmit}
                  disabled={isPending || !newTaskTitle.trim()}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => { setAddingWeekly(false); setNewTaskTitle('') }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingWeekly(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              >
                <span className="text-base leading-none">+</span> Add task
              </button>
            )}
          </div>
        </div>
      </section>

    </div>
  )
}
