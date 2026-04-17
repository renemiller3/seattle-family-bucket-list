'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useBucketList } from '@/hooks/useBucketList'
import { createClient } from '@/lib/supabase/client'
import type { ActivityPhoto } from '@/lib/types'
import Link from 'next/link'
import { getVibeEmoji, getCostDisplay } from '@/lib/utils'
import PhotoUpload from '@/components/photos/PhotoUpload'
import PhotoGallery from '@/components/photos/PhotoGallery'
import { format, parseISO } from 'date-fns'

export default function BucketListPage() {
  const { user, loading: authLoading } = useAuth()
  const { items, loading: listLoading, isCompleted, getOutingName, getCompletedDate, reorderBucketList } = useBucketList(user?.id)
  const [photos, setPhotos] = useState<ActivityPhoto[]>([])
  const supabase = createClient()

  // Fetch all user photos
  const fetchPhotos = async () => {
    if (!user) return
    const { data } = await supabase
      .from('activity_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setPhotos(data ?? [])
  }

  useEffect(() => {
    if (user) fetchPhotos()
  }, [user])

  const handleDeletePhoto = async (photoId: string) => {
    await supabase.from('activity_photos').delete().eq('id', photoId)
    fetchPhotos()
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-200" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">My Bucket List</h1>
        <p className="mb-6 text-gray-600">Sign in to start building your family bucket list.</p>
        <Link href="/" className="text-emerald-600 hover:text-emerald-700 underline">
          Browse activities
        </Link>
      </div>
    )
  }

  if (listLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-200" />
        </div>
      </div>
    )
  }

  const todoItems = items.filter((item) => !isCompleted(item.activity_id))
  const doneItems = items.filter((item) => isCompleted(item.activity_id))

  const getPhotosForActivity = (activityId: string) =>
    photos.filter((p) => p.activity_id === activityId)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Bucket List</h1>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-lg text-gray-500">Your bucket list is empty.</p>
          <p className="mt-1 text-sm text-gray-400">
            Head to Discover to find activities and add them to your bucket list.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Discover Activities
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* To Do */}
          {todoItems.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Adventures Ahead ({todoItems.length})
              </h2>
              <div className="space-y-3">
                {todoItems.map(({ activity_id, activity }, index) => {
                  const outingName = getOutingName(activity_id)
                  return (
                    <div
                      key={activity_id}
                      className="group flex items-center gap-3 sm:gap-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-gray-300"
                    >
                      {/* Reorder arrows */}
                      <div className="shrink-0 flex flex-col items-center w-8">
                        <button
                          onClick={() => index > 0 && reorderBucketList(index, index - 1)}
                          disabled={index === 0}
                          className={`rounded p-1 transition-colors ${index === 0 ? 'text-gray-200' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M18 15l-6-6-6 6" />
                          </svg>
                        </button>
                        <span className="text-xs font-bold text-gray-400 leading-none">
                          {index + 1}
                        </span>
                        <button
                          onClick={() => index < todoItems.length - 1 && reorderBucketList(index, index + 1)}
                          disabled={index === todoItems.length - 1}
                          className={`rounded p-1 transition-colors ${index === todoItems.length - 1 ? 'text-gray-200' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                      </div>

                      <Link href={`/activities/${activity_id}`} className="flex flex-1 items-center gap-4 min-w-0">
                        {activity.image_url && (
                          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            <img src={activity.image_url} alt="" className="h-full w-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                            {activity.title}
                          </h3>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {activity.area} · {getCostDisplay(activity.cost)}
                          </p>
                        </div>
                      </Link>
                      {outingName && (
                        <span className="hidden sm:inline-block shrink-0 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                          {outingName}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Memories */}
          {doneItems.length > 0 && (
            <section>
              <h2 className="mb-5 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Memories ({doneItems.length})
              </h2>
              {/* Timeline */}
              <div className="relative space-y-8 pl-8">
                <div className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-amber-200" />
                {doneItems.map(({ activity_id, activity }) => {
                  const activityPhotos = getPhotosForActivity(activity_id)
                  const completedDate = getCompletedDate(activity_id)
                  const uploadDate = completedDate ?? format(new Date(), 'yyyy-MM-dd')
                  return (
                    <div key={activity_id} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[25px] top-6 h-3.5 w-3.5 rounded-full border-2 border-amber-300 bg-white" />

                      <div className="overflow-hidden rounded-2xl border border-amber-100 bg-amber-50 shadow-sm">
                        {/* Photo area */}
                        {activityPhotos.length > 0 ? (
                          <div className="p-4 pb-2">
                            <PhotoGallery photos={activityPhotos} onDelete={handleDeletePhoto} />
                          </div>
                        ) : (
                          <label
                            htmlFor={`photo-upload-${activity_id}`}
                            className="block cursor-pointer border-b border-amber-100 bg-white/40 px-6 py-8 text-center hover:bg-amber-100/40 transition-colors"
                          >
                            <p className="text-2xl mb-1.5">📷</p>
                            <p className="text-sm text-amber-700/60">Add your first photo from this trip</p>
                          </label>
                        )}

                        {/* Footer */}
                        <div className="flex items-start justify-between gap-3 p-4">
                          <div className="min-w-0">
                            {completedDate && (
                              <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-amber-500">
                                {format(parseISO(completedDate), 'MMMM d, yyyy')}
                              </p>
                            )}
                            <Link
                              href={`/activities/${activity_id}`}
                              className="block truncate font-semibold text-gray-900 hover:text-emerald-700 transition-colors"
                            >
                              {activity.title}
                            </Link>
                            <p className="mt-0.5 text-xs text-gray-500">{activity.area}</p>
                          </div>
                          <div className="shrink-0 pt-0.5">
                            <PhotoUpload
                              activityId={activity_id}
                              dateCompleted={uploadDate}
                              onUploaded={fetchPhotos}
                              compact={activityPhotos.length > 0}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
