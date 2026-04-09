'use client'

import { useState } from 'react'

export default function ShareButton() {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    setLoading(true)
    const res = await fetch('/api/share', { method: 'POST' })
    const data = await res.json()
    if (data.slug) {
      const url = `${window.location.origin}/plan/${data.slug}`
      setShareUrl(url)
    }
    setLoading(false)
  }

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleUnshare = async () => {
    await fetch('/api/share', { method: 'DELETE' })
    setShareUrl(null)
  }

  if (shareUrl) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
          <span className="truncate text-sm text-gray-600">{shareUrl}</span>
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handleUnshare}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
        >
          Unshare
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? 'Creating link...' : 'Share Plan'}
    </button>
  )
}
