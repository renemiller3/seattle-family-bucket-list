'use client'

import Link from 'next/link'
import type { Activity } from '@/lib/types'

interface EventsListProps {
  events: Activity[]
}

export default function EventsList({ events }: EventsListProps) {
  if (events.length === 0) return null

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-bold text-gray-900">Upcoming Events</h2>
      <div className="space-y-3">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/activities/${event.id}`}
            className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100"
          >
            <div>
              <h3 className="font-semibold text-gray-900">{event.title}</h3>
              <p className="text-sm text-gray-600">{event.description}</p>
            </div>
            {event.start_date && (
              <div className="ml-4 shrink-0 text-right">
                <p className="text-sm font-medium text-amber-800">
                  {new Date(event.start_date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                {event.end_date && (
                  <p className="text-xs text-amber-600">
                    to{' '}
                    {new Date(event.end_date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
