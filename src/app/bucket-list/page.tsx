'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useBucketList, type BucketListItem } from '@/hooks/useBucketList'
import { createClient } from '@/lib/supabase/client'
import type { ActivityPhoto } from '@/lib/types'
import Link from 'next/link'
import { getCostDisplay } from '@/lib/utils'
import PhotoUpload from '@/components/photos/PhotoUpload'
import PhotoGallery from '@/components/photos/PhotoGallery'
import AddDreamModal from '@/components/bucket-list/AddDreamModal'
import { format, parseISO } from 'date-fns'

export default function BucketListPage() {
  const { user, loading: authLoading } = useAuth()
  const {
    items,
    loading: listLoading,
    isCompleted,
    getOutingName,
    getCompletedDate,
    reorderBucketList,
    addDream,
    removeDream,
    markComplete,
    markIncomplete,
  } = useBucketList(user?.id)
  const [photos, setPhotos] = useState<ActivityPhoto[]>([])
  const [showAddDream, setShowAddDream] = useState(false)
  const supabase = createClient()

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

  const todoItems = items.filter((item) => !isCompleted(item))
  const doneItems = items.filter((item) => isCompleted(item))

  const getPhotosForItem = (item: BucketListItem) =>
    photos.filter((p) =>
      item.activity_id
        ? p.activity_id === item.activity_id
        : p.user_activity_id === item.user_activity_id
    )

  const getItemTitle = (item: BucketListItem) =>
    item.activity?.title ?? item.user_activity?.title ?? 'Untitled'
  const getItemDetailHref = (item: BucketListItem) =>
    item.activity_id ? `/activities/${item.activity_id}` : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">My Bucket List</h1>
        <button
          onClick={() => setShowAddDream(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3.5 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200 transition-colors"
        >
          <span>✨</span> Add a Dream
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-lg text-gray-500">Your bucket list is empty.</p>
          <p className="mt-1 text-sm text-gray-400">
            Head to Discover to find activities, or add a dream of your own.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Link
              href="/"
              className="inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Discover Activities
            </Link>
            <button
              onClick={() => setShowAddDream(true)}
              className="inline-block rounded-lg bg-amber-100 px-5 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
            >
              ✨ Add a Dream
            </button>
          </div>
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
                {todoItems.map((item, index) => {
                  const outingName = getOutingName(item)
                  const isDream = !!item.user_activity_id
                  const detailHref = getItemDetailHref(item)
                  const title = getItemTitle(item)
                  return (
                    <div
                      key={item.id}
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

                      {detailHref ? (
                        <Link href={detailHref} className="flex flex-1 items-center gap-4 min-w-0">
                          {item.activity?.image_url && (
                            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                              <img src={item.activity.image_url} alt="" className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                              {title}
                            </h3>
                            {item.activity && (
                              <p className="mt-0.5 text-sm text-gray-500">
                                {item.activity.area} · {getCostDisplay(item.activity.cost)}
                              </p>
                            )}
                          </div>
                        </Link>
                      ) : (
                        <div className="flex flex-1 items-center gap-4 min-w-0">
                          <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 text-3xl">
                            {item.user_activity?.emoji ?? '🗺️'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-base font-semibold text-gray-900 truncate">
                                {title}
                              </h3>
                              <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                                Dream
                              </span>
                            </div>
                            {item.user_activity?.location_text && (
                              <p className="mt-0.5 truncate text-sm text-gray-500">
                                {item.user_activity.location_text}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {outingName && (
                        <span className="hidden sm:inline-block shrink-0 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                          {outingName}
                        </span>
                      )}

                      {isDream && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => markComplete(item, format(new Date(), 'yyyy-MM-dd'))}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Mark complete"
                          >
                            ✓ Did it
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove "${title}" from your bucket list?`)) {
                                removeDream(item.user_activity_id!)
                              }
                            }}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 transition-colors"
                            title="Remove"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                            </svg>
                          </button>
                        </div>
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
              <div className="relative space-y-8 pl-8">
                <div className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-amber-200" />
                {doneItems.map((item) => {
                  const activityPhotos = getPhotosForItem(item)
                  const completedDate = getCompletedDate(item)
                  const uploadDate = completedDate ?? format(new Date(), 'yyyy-MM-dd')
                  const isDream = !!item.user_activity_id
                  const detailHref = getItemDetailHref(item)
                  const title = getItemTitle(item)
                  const locationText = item.user_activity?.location_text ?? item.activity?.area ?? null
                  return (
                    <div key={item.id} className="relative">
                      <div className="absolute -left-[25px] top-6 h-3.5 w-3.5 rounded-full border-2 border-amber-300 bg-white" />

                      <div className="overflow-hidden rounded-2xl border border-amber-100 bg-amber-50 shadow-sm">
                        {activityPhotos.length > 0 ? (
                          <div className="p-4 pb-2">
                            <PhotoGallery photos={activityPhotos} onDelete={handleDeletePhoto} />
                          </div>
                        ) : (
                          <label
                            htmlFor={`photo-upload-${item.activity_id ?? item.user_activity_id}`}
                            className="block cursor-pointer border-b border-amber-100 bg-white/40 px-6 py-8 text-center hover:bg-amber-100/40 transition-colors"
                          >
                            <p className="text-2xl mb-1.5">
                              {isDream ? (item.user_activity?.emoji ?? '📷') : '📷'}
                            </p>
                            <p className="text-sm text-amber-700/60">Add your first photo from this trip</p>
                          </label>
                        )}

                        <div className="p-4">
                          {completedDate && (
                            <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-amber-500">
                              {format(parseISO(completedDate), 'MMMM d, yyyy')}
                            </p>
                          )}
                          <div className="flex items-baseline gap-1.5">
                            {detailHref ? (
                              <Link
                                href={detailHref}
                                className="flex-1 truncate font-semibold text-gray-900 hover:text-emerald-700 transition-colors"
                              >
                                {title}
                              </Link>
                            ) : (
                              <>
                                <p className="flex-1 truncate font-semibold text-gray-900">{title}</p>
                                <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                                  Dream
                                </span>
                              </>
                            )}
                          </div>
                          {locationText && (
                            <p className="mt-0.5 text-xs text-gray-500">{locationText}</p>
                          )}
                          <div className="mt-2.5 flex items-center justify-end gap-4">
                            <button
                              onClick={() => markIncomplete(item)}
                              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-amber-600 transition-colors"
                              title="Move back to Adventures Ahead"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                                <path d="M3 3v5h5" />
                              </svg>
                              Undo
                            </button>
                            <PhotoUpload
                              activityId={item.activity_id ?? undefined}
                              userActivityId={item.user_activity_id ?? undefined}
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

      {showAddDream && (
        <AddDreamModal
          onClose={() => setShowAddDream(false)}
          onSubmit={async (input) => {
            await addDream(input)
            setShowAddDream(false)
          }}
        />
      )}
    </div>
  )
}
