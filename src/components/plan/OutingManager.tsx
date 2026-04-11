'use client'

import { useState } from 'react'
import type { Outing } from '@/lib/types'

interface OutingManagerProps {
  outings: Outing[]
  onAdd: (name: string) => Promise<Outing | null>
  onUpdate: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

export default function OutingManager({ outings, onAdd, onUpdate, onDelete, onClose }: OutingManagerProps) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newName.trim()) return
    await onAdd(newName.trim())
    setNewName('')
  }

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return
    await onUpdate(id, editingName.trim())
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    await onDelete(id)
    setConfirmDeleteId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Manage Outings</h2>

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
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {outings.map((outing) => (
              <div
                key={outing.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
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
                    <span className="text-sm text-red-600">Delete "{outing.name}"?</span>
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
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-gray-400">
          Deleting an outing keeps its items on your calendar — they just won't be grouped anymore.
        </p>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Done
        </button>
      </div>
    </div>
  )
}
