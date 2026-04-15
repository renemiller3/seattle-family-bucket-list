'use client'

import { useState } from 'react'
import type { Outing } from '@/lib/types'
import PlaceAutocomplete from './PlaceAutocomplete'

interface OutingManagerProps {
  outings: Outing[]
  onAdd: (name: string) => Promise<Outing | null>
  onUpdate: (id: string, updates: Partial<Pick<Outing, 'name' | 'lodging_name' | 'lodging_address' | 'lodging_lat' | 'lodging_lng'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

export default function OutingManager({ outings, onAdd, onUpdate, onDelete, onClose }: OutingManagerProps) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [lodgingEditId, setLodgingEditId] = useState<string | null>(null)
  const [lodgingName, setLodgingName] = useState('')
  const [lodgingAddress, setLodgingAddress] = useState('')
  const [lodgingLat, setLodgingLat] = useState<number | null>(null)
  const [lodgingLng, setLodgingLng] = useState<number | null>(null)

  const handleAdd = async () => {
    if (!newName.trim()) return
    await onAdd(newName.trim())
    setNewName('')
  }

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return
    await onUpdate(id, { name: editingName.trim() })
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    await onDelete(id)
    setConfirmDeleteId(null)
  }

  const startLodgingEdit = (outing: Outing) => {
    setLodgingEditId(outing.id)
    setLodgingName(outing.lodging_name ?? '')
    setLodgingAddress(outing.lodging_address ?? '')
    setLodgingLat(outing.lodging_lat ?? null)
    setLodgingLng(outing.lodging_lng ?? null)
  }

  const handleSaveLodging = async (id: string) => {
    const hasAddress = !!lodgingAddress.trim()
    await onUpdate(id, {
      lodging_name: lodgingName.trim() || null,
      lodging_address: lodgingAddress.trim() || null,
      lodging_lat: hasAddress ? lodgingLat : null,
      lodging_lng: hasAddress ? lodgingLng : null,
    })
    setLodgingEditId(null)
  }

  const handleRemoveLodging = async (id: string) => {
    await onUpdate(id, {
      lodging_name: null,
      lodging_address: null,
      lodging_lat: null,
      lodging_lng: null,
    })
    setLodgingEditId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl my-auto max-h-[calc(100vh-6rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Manage Outings</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Add new */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="New outing name..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            autoFocus
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {/* Outings list */}
        {outings.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            No outings yet. Create one to start grouping your calendar items.
          </p>
        ) : (
          <div className="space-y-2 max-h-[28rem] overflow-y-auto">
            {outings.map((outing) => (
              <div
                key={outing.id}
                className="rounded-lg border border-gray-200 px-3 py-2"
              >
                {editingId === outing.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(outing.id)}
                      className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(outing.id)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : confirmDeleteId === outing.id ? (
                  <div className="flex flex-1 items-center justify-between">
                    <span className="text-sm text-red-600">Delete &ldquo;{outing.name}&rdquo;?</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(outing.id)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{outing.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(outing.id)
                            setEditingName(outing.name)
                          }}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Rename"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(outing.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          title="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Lodging display / edit toggle */}
                    {lodgingEditId === outing.id ? (
                      <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">Lodging name</label>
                          <input
                            type="text"
                            value={lodgingName}
                            onChange={(e) => setLodgingName(e.target.value)}
                            placeholder="e.g., Airbnb in Bremerton"
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">Address</label>
                          <PlaceAutocomplete
                            value={lodgingAddress}
                            onChange={(val) => {
                              setLodgingAddress(val)
                              if (!val.trim()) {
                                setLodgingLat(null)
                                setLodgingLng(null)
                              }
                            }}
                            onPlaceSelect={(place) => {
                              setLodgingAddress(place.url)
                              setLodgingLat(place.lat)
                              setLodgingLng(place.lng)
                              if (!lodgingName.trim()) setLodgingName(place.name)
                            }}
                            placeholder="Search a place or paste a link"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveLodging(outing.id)}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                          >
                            Save
                          </button>
                          {outing.lodging_name && (
                            <button
                              onClick={() => handleRemoveLodging(outing.id)}
                              className="text-xs text-red-500 hover:text-red-600"
                            >
                              Remove
                            </button>
                          )}
                          <button
                            onClick={() => setLodgingEditId(null)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => startLodgingEdit(outing)}
                        className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        {outing.lodging_name || 'Add lodging'}
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-gray-400">
          Deleting an outing keeps its items on your calendar — they just won&apos;t be grouped anymore.
        </p>

      </div>
    </div>
  )
}
