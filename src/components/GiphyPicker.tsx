'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'

interface GiphyPickerProps {
  onGifSelect: (url: string) => void
  onClose: () => void
}

export function GiphyPicker({ onGifSelect, onClose }: GiphyPickerProps) {
  const [search, setSearch] = useState('')
  const [gifs, setGifs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY || 'dc6zaTOxFJmzC'
  const isDefault = !process.env.NEXT_PUBLIC_GIPHY_API_KEY || process.env.NEXT_PUBLIC_GIPHY_API_KEY === 'dc6zaTOxFJmzC'

  const fetchGifs = async (query: string) => {
    setLoading(true)
    setError(null)
    const endpoint = query 
      ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=20`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20`
    
    try {
      const res = await fetch(endpoint)
      const data = await res.json()
      if (res.status === 403) {
        setError('API_KEY_BANNED')
        setGifs([])
      } else if (!res.ok) {
        setError('FETCH_ERROR')
      } else {
        setGifs(data.data || [])
      }
    } catch (e) {
      setError('NETWORK_ERROR')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => fetchGifs(search), 500)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[450px]">
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
        <span className="font-bold text-sm uppercase tracking-wider text-zinc-500">Giphy</span>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="p-3">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search Giphy..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-100 dark:bg-black border border-transparent focus:border-blue-500 rounded-xl px-4 py-2 text-sm outline-none transition-all"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-hide">
        {error === 'API_KEY_BANNED' ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="text-red-500 font-black text-xs mb-2 uppercase tracking-widest">API Key Blocked</div>
            <p className="text-[12px] text-zinc-500 leading-relaxed mb-4">
              Giphy's public testing key is dead. To use GIFs, please add your own free key to <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">.env.local</code>.
            </p>
            <a href="https://developers.giphy.com/dashboard/" target="_blank" className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black rounded-lg uppercase tracking-tighter">Get Free Key</a>
          </div>
        ) : gifs.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button 
                key={gif.id} 
                onClick={() => onGifSelect(gif.images.original.url)}
                className="relative aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 hover:opacity-80 transition-opacity"
              >
                <img 
                  src={gif.images.fixed_width.url} 
                  alt={gif.title}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : !loading && (
          <div className="flex items-center justify-center h-full text-zinc-400 text-sm italic">
            {search ? 'No GIFs found' : 'Feeling lucky? Try searching...'}
          </div>
        )}
      </div>
    </div>
  )
}
