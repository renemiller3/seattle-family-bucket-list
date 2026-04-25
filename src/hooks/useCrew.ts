'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  addCrewMember as addCrewAction,
  deleteCrewMember as deleteCrewAction,
  listCrew,
  updateCrewMember as updateCrewAction,
} from '@/app/crew/actions'
import type { CrewMember } from '@/lib/types'

export function useCrew(userId: string | undefined) {
  const [crew, setCrew] = useState<CrewMember[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) {
      setCrew([])
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await listCrew()
    if (res.ok) setCrew(res.data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = async (input: { name: string; phone: string | null; email: string | null }) => {
    const res = await addCrewAction(input)
    if (res.ok) setCrew((prev) => [...prev, res.data])
    return res
  }

  const update = async (
    id: string,
    input: {
      name?: string
      phone?: string | null
      email?: string | null
      receives_weekly_plan?: boolean
    }
  ) => {
    const res = await updateCrewAction(id, input)
    if (res.ok) setCrew((prev) => prev.map((c) => (c.id === id ? res.data : c)))
    return res
  }

  const remove = async (id: string) => {
    setCrew((prev) => prev.filter((c) => c.id !== id))
    await deleteCrewAction(id)
  }

  return { crew, loading, add, update, remove, refresh }
}
