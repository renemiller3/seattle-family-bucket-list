'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, DayOfWeek } from '@/lib/types'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setProfile(data ?? null)
        setLoading(false)
      })
  }, [userId])

  const updateHomeAddress = async (address: string, lat: number, lng: number) => {
    if (!userId) return
    const { data } = await supabase
      .from('profiles')
      .update({ home_address: address, home_lat: lat, home_lng: lng })
      .eq('id', userId)
      .select()
      .single()
    if (data) setProfile(data)
  }

  const clearHomeAddress = async () => {
    if (!userId) return
    const { data } = await supabase
      .from('profiles')
      .update({ home_address: null, home_lat: null, home_lng: null })
      .eq('id', userId)
      .select()
      .single()
    if (data) setProfile(data)
  }

  const updateKidsAges = async (ages: number[]) => {
    if (!userId) return
    const { data } = await supabase
      .from('profiles')
      .update({ kids_ages: ages.length > 0 ? ages : null })
      .eq('id', userId)
      .select()
      .single()
    if (data) setProfile(data)
  }

  const updateNapTime = async (startTime: string | null, endTime: string | null) => {
    if (!userId) return
    const { data } = await supabase
      .from('profiles')
      .update({ nap_start_time: startTime, nap_end_time: endTime })
      .eq('id', userId)
      .select()
      .single()
    if (data) setProfile(data)
  }

  const updateWeeklyPlanEmail = async (day: DayOfWeek | null, includeCrew: boolean) => {
    if (!userId) return
    const { data } = await supabase
      .from('profiles')
      .update({ weekly_plan_day: day, weekly_plan_include_crew: includeCrew })
      .eq('id', userId)
      .select()
      .single()
    if (data) setProfile(data)
  }

  return { profile, loading, updateHomeAddress, clearHomeAddress, updateKidsAges, updateNapTime, updateWeeklyPlanEmail }
}
