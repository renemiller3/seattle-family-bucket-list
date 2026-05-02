'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user)) throw new Error('Forbidden')
}

function revalidate() {
  revalidatePath('/admin/ops')
}

// ─── Recurring tasks ──────────────────────────────────────────────────────────

export async function addRecurringTask(title: string, notes?: string, dayOfWeek?: string): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()

  // Place at end of current list
  const { count } = await admin
    .from('ops_recurring_tasks')
    .select('*', { count: 'exact', head: true })

  await admin.from('ops_recurring_tasks').insert({
    title: title.trim(),
    notes: notes?.trim() || null,
    day_of_week: dayOfWeek || null,
    sort_order: count ?? 0,
    is_active: true,
  })

  revalidate()
}

export async function updateRecurringTask(
  id: string,
  fields: { title?: string; notes?: string | null; day_of_week?: string | null },
): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()

  await admin.from('ops_recurring_tasks').update({
    ...fields,
    title: fields.title?.trim(),
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  revalidate()
}

export async function deleteRecurringTask(id: string): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('ops_recurring_tasks').delete().eq('id', id)
  revalidate()
}

export async function setRecurringTaskActive(id: string, isActive: boolean): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('ops_recurring_tasks').update({
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  revalidate()
}

export async function moveRecurringTask(id: string, direction: 'up' | 'down'): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: tasks } = await admin
    .from('ops_recurring_tasks')
    .select('id, sort_order')
    .order('sort_order')

  if (!tasks) return

  const idx = tasks.findIndex((t) => t.id === id)
  if (idx === -1) return

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= tasks.length) return

  const a = tasks[idx]
  const b = tasks[swapIdx]

  await Promise.all([
    admin.from('ops_recurring_tasks').update({ sort_order: b.sort_order, updated_at: new Date().toISOString() }).eq('id', a.id),
    admin.from('ops_recurring_tasks').update({ sort_order: a.sort_order, updated_at: new Date().toISOString() }).eq('id', b.id),
  ])

  revalidate()
}

// ─── Recurring completions ────────────────────────────────────────────────────

export async function toggleRecurringCompletion(recurringTaskId: string, weekStarting: string): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('ops_recurring_completions')
    .select('id')
    .eq('recurring_task_id', recurringTaskId)
    .eq('week_starting', weekStarting)
    .single()

  if (existing) {
    await admin.from('ops_recurring_completions').delete().eq('id', existing.id)
  } else {
    await admin.from('ops_recurring_completions').insert({
      recurring_task_id: recurringTaskId,
      week_starting: weekStarting,
    })
  }

  revalidate()
}

// ─── Weekly one-off tasks ─────────────────────────────────────────────────────

export async function addWeeklyTask(weekStarting: string, title: string): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()

  const { count } = await admin
    .from('ops_weekly_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('week_starting', weekStarting)

  await admin.from('ops_weekly_tasks').insert({
    week_starting: weekStarting,
    title: title.trim(),
    is_done: false,
    sort_order: count ?? 0,
  })

  revalidate()
}

export async function toggleWeeklyTask(id: string, isDone: boolean): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('ops_weekly_tasks').update({
    is_done: isDone,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  revalidate()
}

export async function deleteWeeklyTask(id: string): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('ops_weekly_tasks').delete().eq('id', id)
  revalidate()
}
