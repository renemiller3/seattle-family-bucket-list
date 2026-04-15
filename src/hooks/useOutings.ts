'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Outing } from '@/lib/types'

export function useOutings(userId: string | undefined) {
  const [outings, setOutings] = useState<Outing[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchOutings = useCallback(async () => {
    if (!userId) {
      setOutings([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('outings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    setOutings((data as Outing[]) ?? [])
    setLoading(false)
  }, [userId, supabase])

  useEffect(() => {
    fetchOutings()
  }, [fetchOutings])

  const addOuting = async (name: string): Promise<Outing | null> => {
    if (!userId) return null
    const { data } = await supabase
      .from('outings')
      .insert({ user_id: userId, name })
      .select()
      .single()
    if (data) {
      const outing = data as Outing
      setOutings((prev) => [...prev, outing])
      return outing
    }
    return null
  }

  const updateOuting = async (id: string, updates: Partial<Pick<Outing, 'name' | 'lodging_name' | 'lodging_address' | 'lodging_lat' | 'lodging_lng'>>) => {
    await supabase.from('outings').update(updates).eq('id', id)
    setOutings((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)))
  }

  const deleteOuting = async (id: string) => {
    await supabase.from('outings').delete().eq('id', id)
    setOutings((prev) => prev.filter((o) => o.id !== id))
  }

  return { outings, loading, addOuting, updateOuting, deleteOuting, refresh: fetchOutings }
}
