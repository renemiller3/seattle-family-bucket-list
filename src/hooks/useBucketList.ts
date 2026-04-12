'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Activity } from '@/lib/types'

interface BucketListItem {
  user_id: string
  activity_id: string
  created_at: string
  activity: Activity
}

export function useBucketList(userId: string | undefined) {
  const [items, setItems] = useState<BucketListItem[]>([])
  const [completedActivityIds, setCompletedActivityIds] = useState<Set<string>>(new Set())
  const [activityOutingMap, setActivityOutingMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchItems = useCallback(async () => {
    if (!userId) {
      setItems([])
      setCompletedActivityIds(new Set())
      setLoading(false)
      return
    }

    // Fetch saved activities with joined activity data
    const { data: saved } = await supabase
      .from('saved_activities')
      .select('*, activity:activities(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Fetch completed plan items to know which bucket list items are "done"
    const { data: completed } = await supabase
      .from('plan_items')
      .select('activity_id')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .not('activity_id', 'is', null)

    // Fetch plan items with outings to map activity_id → outing name
    const { data: planItemsWithOutings } = await supabase
      .from('plan_items')
      .select('activity_id, outing:outings(name)')
      .eq('user_id', userId)
      .not('activity_id', 'is', null)
      .not('outing_id', 'is', null)
      .order('created_at', { ascending: false })

    const outingMap: Record<string, string> = {}
    if (planItemsWithOutings) {
      for (const item of planItemsWithOutings as any[]) {
        if (item.activity_id && item.outing?.name && !outingMap[item.activity_id]) {
          outingMap[item.activity_id] = item.outing.name
        }
      }
    }

    setItems((saved as BucketListItem[]) ?? [])
    setCompletedActivityIds(
      new Set((completed ?? []).map((item: any) => item.activity_id).filter(Boolean))
    )
    setActivityOutingMap(outingMap)
    setLoading(false)
  }, [userId, supabase])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const bucketListIds = useMemo(
    () => new Set(items.map((item) => item.activity_id)),
    [items]
  )

  const isOnBucketList = useCallback(
    (activityId: string) => bucketListIds.has(activityId),
    [bucketListIds]
  )

  const isCompleted = useCallback(
    (activityId: string) => completedActivityIds.has(activityId),
    [completedActivityIds]
  )

  const getOutingName = useCallback(
    (activityId: string) => activityOutingMap[activityId] || null,
    [activityOutingMap]
  )

  const addToBucketList = async (activityId: string) => {
    if (!userId) return
    await supabase.from('saved_activities').insert({ user_id: userId, activity_id: activityId })
    fetchItems()
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

  return {
    items,
    loading,
    bucketListIds,
    isOnBucketList,
    isCompleted,
    getOutingName,
    addToBucketList,
    removeFromBucketList,
    toggleBucketList,
    refresh: fetchItems,
  }
}
