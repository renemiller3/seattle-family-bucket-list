'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Activity } from '@/lib/types'

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('activities')
      .select('*')
      .order('title')
      .then(({ data }) => {
        setActivities(data ?? [])
        setLoading(false)
      })
  }, [])

  return { activities, loading }
}
