'use client'

import { useState, useRef } from 'react'

interface ImageSearchProps {
  onSelect: (url: string) => void
  onClose: () => void
}

interface SearchResult {
  id: string
  url: string
  thumb: string
  alt: string
  credit?: string
}

export default function ImageSearch({ onSelect, onClose }: ImageSearchProps) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'photos' | 'gifs'>('photos')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const searchUnsplash = async (q: string) => {
    const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
    if (!key) return []
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=12&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    )
    const data = await res.json()
    return (data.results || []).map((r: any) => ({
      id: r.id,
      url: r.urls.regular,
      thumb: r.urls.small,
      alt: r.alt_description || q,
      credit: r.user?.name,
    }))
  }

  const searchGiphy = async (q: string) => {
    const key = process.env.NEXT_PUBLIC_GIPHY_API_KEY
    if (!key) return []
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=12&rating=g`
    )
    const data = await res.json()
    return (data.data || []).map((r: any) => ({
      id: r.id,
      url: r.images.original.url,
      thumb: r.images.fixed_width.url,
      alt: r.title || q,
    }))
  }

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    const searchResults = tab === 'photos'
      ? await searchUnsplash(query.trim())
      : await searchGiphy(query.trim())
    setResults(searchResults)
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleTabChange = (newTab: 'photos' | 'gifs') => {
    setTab(newTab)
    setResults([])
    setSearched(false)
    if (query.trim()) {
      // Re-search with new tab
      setTab(newTab)
      setTimeout(() => {
        setLoading(true)
        setSearched(true)
        const search = newTab === 'photos' ? searchUnsplash : searchGiphy
        search(query.trim()).then((r) => {
          setResults(r)
          setLoading(false)
        })
      }, 0)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl my-auto max-h-[calc(100vh-4rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Find an image</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-3 flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            onClick={() => handleTabChange('photos')}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'photos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Photos
          </button>
          <button
            onClick={() => handleTabChange('gifs')}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'gifs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            GIFs
          </button>
        </div>

        {/* Search input */}
        <div className="mb-4 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tab === 'photos' ? 'Search photos...' : 'Search GIFs...'}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            autoFocus
          />
          <button
            onClick={handleSearch}
            disabled={!query.trim() || loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Search
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="py-8 text-center text-sm text-gray-400">Searching...</div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => onSelect(result.url)}
                className="group relative aspect-video overflow-hidden rounded-lg bg-gray-100 hover:ring-2 hover:ring-emerald-500 transition-all"
              >
                <img
                  src={result.thumb}
                  alt={result.alt}
                  className="h-full w-full object-cover"
                />
                {result.credit && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-white truncate">{result.credit}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : searched ? (
          <div className="py-8 text-center text-sm text-gray-400">
            No {tab === 'photos' ? 'photos' : 'GIFs'} found. Try a different search.
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-400">
            Search for {tab === 'photos' ? 'photos' : 'GIFs'} to add to your block.
          </div>
        )}

        {/* Attribution */}
        <div className="mt-3 text-center text-[10px] text-gray-300">
          {tab === 'photos' ? 'Powered by Unsplash' : 'Powered by GIPHY'}
        </div>
      </div>
    </div>
  )
}
