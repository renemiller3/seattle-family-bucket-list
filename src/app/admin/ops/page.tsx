import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin'
import OpsWeeklyView from '@/components/admin/OpsWeeklyView'
import type { OpsRecurringTask, OpsWeeklyTask } from '@/lib/types'

export const metadata = { title: 'Admin — Ops' }
export const dynamic = 'force-dynamic'

// Returns the ISO date string (YYYY-MM-DD) of the Monday of the week
// containing the given date.
function getMondayOf(dateStr?: string): string {
  const base = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  if (isNaN(base.getTime())) return getMondayOf()
  const day = base.getDay() // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  base.setDate(base.getDate() + diff)
  return base.toISOString().slice(0, 10)
}

function offsetWeek(monday: string, weeks: number): string {
  const d = new Date(monday + 'T12:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user)) redirect('/')

  const params = await searchParams
  const weekStarting = getMondayOf(params.week)
  const currentWeekMonday = getMondayOf()
  const isCurrentWeek = weekStarting === currentWeekMonday
  const prevWeek = offsetWeek(weekStarting, -1)
  const nextWeek = offsetWeek(weekStarting, 1)
  const canGoNext = nextWeek <= offsetWeek(currentWeekMonday, 4) // allow planning up to 4 weeks ahead

  const admin = createAdminClient()
  const [recurringRes, completionsRes, weeklyRes] = await Promise.all([
    admin
      .from('ops_recurring_tasks')
      .select('*')
      .order('sort_order'),
    admin
      .from('ops_recurring_completions')
      .select('recurring_task_id')
      .eq('week_starting', weekStarting),
    admin
      .from('ops_weekly_tasks')
      .select('*')
      .eq('week_starting', weekStarting)
      .order('sort_order'),
  ])

  const completedIds = new Set(
    (completionsRes.data ?? []).map((r: { recurring_task_id: string }) => r.recurring_task_id)
  )

  return (
    <OpsWeeklyView
      recurringTasks={(recurringRes.data ?? []) as OpsRecurringTask[]}
      completedIds={[...completedIds]}
      weeklyTasks={(weeklyRes.data ?? []) as OpsWeeklyTask[]}
      weekStarting={weekStarting}
      isCurrentWeek={isCurrentWeek}
      prevWeek={prevWeek}
      nextWeek={nextWeek}
      canGoNext={canGoNext}
    />
  )
}
