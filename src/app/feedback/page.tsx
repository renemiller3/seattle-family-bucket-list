'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function FeedbackPage() {
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setStatus('submitting')
    const supabase = createClient()

    const { error } = await supabase.from('feedback').insert({
      message: message.trim(),
      submitted_by: name.trim() || null,
      page_url: document.referrer || null,
    })

    if (error) {
      setStatus('error')
    } else {
      setStatus('success')
      setMessage('')
      setName('')
    }
  }

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <div className="mb-4 text-5xl">💬</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Thanks for the feedback!</h1>
        <p className="mb-6 text-gray-600">We appreciate you taking the time to share.</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setStatus('idle')}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Send more feedback
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
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Report an Issue or Share an Idea</h1>
      <p className="mb-6 text-gray-600">
        Found a bug? Have a suggestion? We'd love to hear from you.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            What's on your mind? <span className="text-red-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue or share your idea..."
            rows={4}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Your name <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="So we can follow up if needed"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {status === 'error' && (
          <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
        )}

        <button
          type="submit"
          disabled={!message.trim() || status === 'submitting'}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {status === 'submitting' ? 'Sending...' : 'Send Feedback'}
        </button>
      </form>
    </div>
  )
}
