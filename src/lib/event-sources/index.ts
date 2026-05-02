import { fetchParentMapEvents } from './parentmap'
import { fetchVisitSeattleEvents } from './visitseattle'
import type { RawEvent } from './types'

export type { RawEvent }

export interface FetchResult {
  events: RawEvent[]
  sourceErrors: { source: string; error: string }[]
}

// Runs all source connectors concurrently. One failing source never
// blocks the others — errors are captured and returned separately.
export async function fetchAllSources(): Promise<FetchResult> {
  const sources = [
    { name: 'parentmap', fn: fetchParentMapEvents },
    { name: 'visitseattle', fn: fetchVisitSeattleEvents },
  ]

  const results = await Promise.allSettled(sources.map((s) => s.fn()))

  const events: RawEvent[] = []
  const sourceErrors: { source: string; error: string }[] = []

  for (let i = 0; i < sources.length; i++) {
    const r = results[i]
    if (r.status === 'fulfilled') {
      events.push(...r.value)
    } else {
      sourceErrors.push({
        source: sources[i].name,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      })
    }
  }

  return { events, sourceErrors }
}
