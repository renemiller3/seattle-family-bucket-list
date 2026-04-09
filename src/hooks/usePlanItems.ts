'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlanItem } from '@/lib/types'

export function usePlanItems(userId: string | undefined) {
  const [items, setItems] = useState<PlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchItems = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('plan_items')
      .select('*, activity:activities(*)')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .order('sort_order', { ascending: true })

    setItems((data as PlanItem[]) ?? [])
    setLoading(false)
  }, [userId, supabase])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const addItem = async (item: Omit<PlanItem, 'id' | 'created_at' | 'updated_at' | 'activity'>) => {
    const { data } = await supabase.from('plan_items').insert(item).select('*, activity:activities(*)').single()
    if (data) {
      setItems((prev) => [...prev, data as PlanItem].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        return a.sort_order - b.sort_order
      }))
    }
    return data
  }

  const updateItem = async (id: string, updates: Partial<PlanItem>) => {
    const { data } = await supabase
      .from('plan_items')
      .update(updates)
      .eq('id', id)
      .select('*, activity:activities(*)')
      .single()
    if (data) {
      setItems((prev) => prev.map((item) => (item.id === id ? (data as PlanItem) : item)))
    }
  }

  const deleteItem = async (id: string) => {
    await supabase.from('plan_items').delete().eq('id', id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const reorderItems = async (date: string, orderedIds: string[]) => {
    const updates = orderedIds.map((id, index) => ({
      id,
      sort_order: index,
    }))

    // Optimistic update
    setItems((prev) =>
      prev.map((item) => {
        const newOrder = orderedIds.indexOf(item.id)
        if (newOrder !== -1) return { ...item, sort_order: newOrder }
        return item
      }).sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        return a.sort_order - b.sort_order
      })
    )

    // Persist
    for (const update of updates) {
      await supabase.from('plan_items').update({ sort_order: update.sort_order }).eq('id', update.id)
    }
  }

  return { items, loading, addItem, updateItem, deleteItem, reorderItems, refresh: fetchItems }
}
