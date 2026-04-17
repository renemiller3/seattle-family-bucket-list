'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function SuggestPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [submittedBy, setSubmittedBy] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setStatus('submitting')

    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        submitted_by: submittedBy.trim() || null,
      }),
    })

    if (!res.ok) {
      setStatus('error')
    } else {
      setStatus('success')
      setName('')
      setDescription('')
      setLocation('')
      setSubmittedBy('')
    }
  }

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <div className="mb-4 text-5xl">🎉</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Thanks for the suggestion!</h1>
        <p className="mb-6 text-gray-600">We'll check it out and maybe add it to the bucket list.</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setStatus('idle')}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Suggest another
          </button>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to activities
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Suggest a Bucket List Item</h1>
      <p className="mb-6 text-gray-600">
        Know a great family activity in the Seattle area or PNW? Let us know!
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Activity Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., San Juan Island whale watching"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Why is it great for families? <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us what makes it special..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Location <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Friday Harbor, WA"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Your name <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            placeholder="So we can credit you!"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {status === 'error' && (
          <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
        )}

        <button
          type="submit"
          disabled={!name.trim() || status === 'submitting'}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {status === 'submitting' ? 'Submitting...' : 'Submit Suggestion'}
        </button>
      </form>
    </div>
  )
}
