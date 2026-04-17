'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Activity, UserActivity } from '@/lib/types'

export interface BucketListItem {
  id: string
  user_id: string
  activity_id: string | null
  user_activity_id: string | null
  sort_order: number
  created_at: string
  activity: Activity | null
  user_activity: UserActivity | null
}

export interface CreateDreamInput {
  title: string
  location_text?: string | null
  lat?: number | null
  lng?: number | null
  emoji?: string | null
  notes?: string | null
}

export function useBucketList(userId: string | undefined) {
  const [items, setItems] = useState<BucketListItem[]>([])
  const [completedActivityIds, setCompletedActivityIds] = useState<Set<string>>(new Set())
  const [completedUserActivityIds, setCompletedUserActivityIds] = useState<Set<string>>(new Set())
  const [activityOutingMap, setActivityOutingMap] = useState<Record<string, string>>({})
  const [userActivityOutingMap, setUserActivityOutingMap] = useState<Record<string, string>>({})
  const [activityCompletedDateMap, setActivityCompletedDateMap] = useState<Record<string, string>>({})
  const [userActivityCompletedDateMap, setUserActivityCompletedDateMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchItems = useCallback(async () => {
    if (!userId) {
      setItems([])
      setCompletedActivityIds(new Set())
      setCompletedUserActivityIds(new Set())
      setLoading(false)
      return
    }

    const { data: saved } = await supabase
      .from('saved_activities')
      .select('*, activity:activities(*), user_activity:user_activities(*)')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    const { data: completed } = await supabase
      .from('plan_items')
      .select('activity_id, user_activity_id, date')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .or('activity_id.not.is.null,user_activity_id.not.is.null')
      .order('date', { ascending: false })

    const { data: planItemsWithOutings } = await supabase
      .from('plan_items')
      .select('activity_id, user_activity_id, outing:outings(name)')
      .eq('user_id', userId)
      .or('activity_id.not.is.null,user_activity_id.not.is.null')
      .not('outing_id', 'is', null)
      .order('created_at', { ascending: false })

    const outingMap: Record<string, string> = {}
    const uaOutingMap: Record<string, string> = {}
    if (planItemsWithOutings) {
      for (const item of planItemsWithOutings as any[]) {
        const name = item.outing?.name
        if (!name) continue
        if (item.activity_id && !outingMap[item.activity_id]) outingMap[item.activity_id] = name
        if (item.user_activity_id && !uaOutingMap[item.user_activity_id]) uaOutingMap[item.user_activity_id] = name
      }
    }

    const dateMap: Record<string, string> = {}
    const uaDateMap: Record<string, string> = {}
    const completedA = new Set<string>()
    const completedUA = new Set<string>()
    if (completed) {
      for (const item of completed as any[]) {
        if (item.activity_id) {
          completedA.add(item.activity_id)
          if (item.date && !dateMap[item.activity_id]) dateMap[item.activity_id] = item.date
        }
        if (item.user_activity_id) {
          completedUA.add(item.user_activity_id)
          if (item.date && !uaDateMap[item.user_activity_id]) uaDateMap[item.user_activity_id] = item.date
        }
      }
    }

    setItems((saved as BucketListItem[]) ?? [])
    setCompletedActivityIds(completedA)
    setCompletedUserActivityIds(completedUA)
    setActivityCompletedDateMap(dateMap)
    setUserActivityCompletedDateMap(uaDateMap)
    setActivityOutingMap(outingMap)
    setUserActivityOutingMap(uaOutingMap)
    setLoading(false)
  }, [userId, supabase])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const bucketListIds = useMemo(
    () => new Set(items.map((i) => i.activity_id).filter((id): id is string => !!id)),
    [items]
  )

  const isOnBucketList = useCallback(
    (activityId: string) => bucketListIds.has(activityId),
    [bucketListIds]
  )

  const isCompleted = useCallback(
    (item: Pick<BucketListItem, 'activity_id' | 'user_activity_id'>) => {
      if (item.activity_id) return completedActivityIds.has(item.activity_id)
      if (item.user_activity_id) return completedUserActivityIds.has(item.user_activity_id)
      return false
    },
    [completedActivityIds, completedUserActivityIds]
  )

  const getOutingName = useCallback(
    (item: Pick<BucketListItem, 'activity_id' | 'user_activity_id'>) => {
      if (item.activity_id) return activityOutingMap[item.activity_id] || null
      if (item.user_activity_id) return userActivityOutingMap[item.user_activity_id] || null
      return null
    },
    [activityOutingMap, userActivityOutingMap]
  )

  const getCompletedDate = useCallback(
    (item: Pick<BucketListItem, 'activity_id' | 'user_activity_id'>) => {
      if (item.activity_id) return activityCompletedDateMap[item.activity_id] || null
      if (item.user_activity_id) return userActivityCompletedDateMap[item.user_activity_id] || null
      return null
    },
    [activityCompletedDateMap, userActivityCompletedDateMap]
  )

  const addToBucketList = async (activityId: string) => {
    if (!userId) return
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order ?? 0)) + 1 : 0
    await supabase.from('saved_activities').insert({ user_id: userId, activity_id: activityId, sort_order: maxOrder })
    fetchItems()
  }

  const reorderBucketList = async (fromIndex: number, toIndex: number) => {
    if (!userId) return
    const todoOnly = items.filter((i) => !isCompleted(i))
    const reordered = [...todoOnly]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)

    // Optimistic update
    const newItems = [...items]
    const todoIds = new Set(todoOnly.map((i) => i.id))
    let todoIdx = 0
    for (let i = 0; i < newItems.length; i++) {
      if (todoIds.has(newItems[i].id)) {
        newItems[i] = { ...reordered[todoIdx], sort_order: todoIdx }
        todoIdx++
      }
    }
    setItems(newItems)

    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('saved_activities').update({ sort_order: i }).eq('id', reordered[i].id)
    }
  }

  const removeFromBucketList = async (activityId: string) => {
    if (!userId) return
    await supabase.from('saved_activities').delete().eq('user_id', userId).eq('activity_id', activityId)
    setItems((prev) => prev.filter((item) => item.activity_id !== activityId))
  }

  const toggleBucketList = async (activityId: string) => {
    if (isOnBucketList(activityId)) {
      await removeFromBucketList(activityId)
    } else {
      await addToBucketList(activityId)
    }
  }

  const addDream = async (input: CreateDreamInput): Promise<UserActivity | null> => {
    if (!userId) return null
    const { data: dream, error: dreamErr } = await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        title: input.title,
        location_text: input.location_text ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        emoji: input.emoji ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single()
    if (dreamErr || !dream) return null

    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order ?? 0)) + 1 : 0
    await supabase.from('saved_activities').insert({
      user_id: userId,
      user_activity_id: dream.id,
      sort_order: maxOrder,
    })
    await fetchItems()
    return dream as UserActivity
  }

  const removeDream = async (userActivityId: string) => {
    if (!userId) return
    await supabase.from('user_activities').delete().eq('id', userActivityId)
    setItems((prev) => prev.filter((i) => i.user_activity_id !== userActivityId))
  }

  const markComplete = async (item: Pick<BucketListItem, 'activity_id' | 'user_activity_id'>, date: string) => {
    if (!userId) return
    if (isCompleted(item)) return
    await supabase.from('plan_items').insert({
      user_id: userId,
      activity_id: item.activity_id ?? null,
      user_activity_id: item.user_activity_id ?? null,
      type: 'activity',
      date,
      is_completed: true,
    })
    await fetchItems()
  }

  return {
    items,
    loading,
    bucketListIds,
    isOnBucketList,
    isCompleted,
    getOutingName,
    getCompletedDate,
    addToBucketList,
    removeFromBucketList,
    toggleBucketList,
    reorderBucketList,
    addDream,
    removeDream,
    markComplete,
    refresh: fetchItems,
  }
}
