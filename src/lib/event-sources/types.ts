import type { EventSourceType } from '@/lib/types'

export interface RawEvent {
  sourceType: EventSourceType
  sourceId: string      // stable, unique ID within the source for dedup
  sourceUrl: string     // URL to the original event page
  title: string
  description: string
  location: string | null
  startAt: Date
  endAt: Date | null
  imageUrl: string | null
  costText: string | null
}
