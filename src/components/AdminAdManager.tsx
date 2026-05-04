'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { PhotoIcon, XMarkIcon, PlusIcon, ChartBarIcon, TrashIcon, VideoCameraIcon } from '@heroicons/react/24/outline'

export function AdminAdManager() {
  const [ads, setAds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [selectedAd, setSelectedAd] = useState<any | null>(null)
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [targetUrl, setTargetUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Tabs for Admin
  const [activeAdminTab, setActiveAdminTab] = useState<'ads' | 'creators'>('ads')
  const [pendingCreators, setPendingCreators] = useState<any[]>([])
  const [loadingCreators, setLoadingCreators] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchAds()
  }, [])

  async function fetchAds() {
    setLoading(true)
    const { data } = await supabase.from('direct_ads').select('*').order('created_at', { ascending: false })
    if (data) setAds(data)
    setLoading(false)
  }

  async function fetchPendingCreators() {
    setLoadingCreators(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, settings, created_at')
      .neq('settings->creator_application_status', null)
      .eq('settings->creator_application_status', 'pending')
    
    if (data) setPendingCreators(data)
    setLoadingCreators(false)
  }

  useEffect(() => {
    if (activeAdminTab === 'creators') fetchPendingCreators()
  }, [activeAdminTab])

  async function handleCreatorAction(creatorId: string, action: 'approved' | 'declined') {
    const { data: profileData } = await supabase.from('profiles').select('settings').eq('id', creatorId).single()
    const newSettings = { ...profileData?.settings, creator_application_status: action }
    
    const updates: any = { settings: newSettings }
    if (action === 'approved') {
      updates.monetization_enabled = true
      updates.is_verified = true // Optional: auto-verify if they get monetization
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', creatorId)
    if (!error) {
      alert(`Creator ${action} successfully!`)
      fetchPendingCreators()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!imageFile) return
    setSubmitting(true)

    try {
      // 1. Upload image
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ads')
        .upload(fileName, imageFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('ads').getPublicUrl(fileName)

      let videoUrl = null
      if (videoFile) {
        const videoName = `${Math.random()}.mp4`
        const { error: videoError } = await supabase.storage.from('ads').upload(videoName, videoFile)
        if (videoError) throw videoError
        videoUrl = supabase.storage.from('ads').getPublicUrl(videoName).data.publicUrl
      }

      // 2. Create ad record
      const { error: insertError } = await supabase.from('direct_ads').insert([{
        title,
        description,
        image_url: publicUrl,
        video_url: videoUrl,
        target_url: targetUrl
      }])

      if (insertError) throw insertError

      // Reset
      setTitle('')
      setDescription('')
      setImageFile(null)
      setVideoFile(null)
      setTargetUrl('')
      setIsAdding(false)
      fetchAds()
    } catch (err) {
      console.error('Error adding ad:', err)
      alert('Failed to add ad')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteAd(id: string, imageUrl: string) {
    if (!confirm('Are you sure you want to delete this ad?')) return
    
    try {
        // Delete record
        await supabase.from('direct_ads').delete().eq('id', id)
        // Optionally delete file from storage if you parse the URL
        fetchAds()
    } catch (err) {
        console.error('Error deleting ad:', err)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-2 w-full">
      {/* Admin Tab Switcher */}
      <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl mb-4 self-start">
        <button 
          onClick={() => setActiveAdminTab('ads')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeAdminTab === 'ads' ? 'bg-white dark:bg-black text-violet-600 shadow-sm' : 'text-zinc-500'}`}
        >
          Ads
        </button>
        <button 
          onClick={() => setActiveAdminTab('creators')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeAdminTab === 'creators' ? 'bg-white dark:bg-black text-amber-500 shadow-sm' : 'text-zinc-500'}`}
        >
          Creator Program
          {pendingCreators.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCreators.length}</span>}
        </button>
        <a 
          href="/admin/withdrawals"
          className="px-6 py-2 rounded-xl text-sm font-bold transition-all text-zinc-500 hover:bg-white dark:hover:bg-black hover:text-emerald-500"
        >
          Withdrawals
        </a>
      </div>

      {activeAdminTab === 'ads' ? (
        <>
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-zinc-900 dark:text-white">Direct Ads</h2>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold transition-transform active:scale-95"
            >
              {isAdding ? <XMarkIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
              {isAdding ? 'Cancel' : 'New Advertisement'}
            </button>
          </div>

          {isAdding && (
            <form onSubmit={handleSubmit} className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Title (Company Name)</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g. Coca-Cola" 
                  required
                  className="w-full px-4 py-3 bg-white dark:bg-black rounded-2xl border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Description</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Write a short catchy text..." 
                  className="w-full px-4 py-3 bg-white dark:bg-black rounded-2xl border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500 h-24 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 text-violet-500">Ad Image (Poster)</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => setImageFile(e.target.files?.[0] || null)} 
                    required
                    className="hidden"
                    id="ad-image-upload"
                  />
                  <label 
                    htmlFor="ad-image-upload"
                    className="flex items-center justify-center gap-3 w-full py-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl cursor-pointer hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all font-bold"
                  >
                    {imageFile ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-medium text-violet-600 truncate max-w-[200px]">{imageFile.name}</span>
                        <span className="text-[10px] text-zinc-400 font-bold">Tap to change</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <PhotoIcon className="w-6 h-6 text-zinc-300 group-hover:text-violet-500" />
                        <span className="text-xs font-medium text-zinc-400">Add Ad Poster (800x450 recommended)</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Ad Video (Optional)</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="video/*" 
                    onChange={e => setVideoFile(e.target.files?.[0] || null)} 
                    className="hidden"
                    id="ad-video-upload"
                  />
                  <label 
                    htmlFor="ad-video-upload"
                    className="flex items-center justify-center gap-3 w-full py-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl cursor-pointer hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all font-bold"
                  >
                    {videoFile ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-medium text-violet-600 truncate max-w-[200px]">{videoFile.name}</span>
                        <span className="text-[10px] text-zinc-400 font-bold">Tap to change</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <VideoCameraIcon className="w-6 h-6 text-zinc-300 group-hover:text-violet-500" />
                        <span className="text-xs font-medium text-zinc-400 font-bold">Add High Quality Video</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Destination URL</label>
                <input 
                  type="url" 
                  value={targetUrl} 
                  onChange={e => setTargetUrl(e.target.value)} 
                  placeholder="https://example.com" 
                  required
                  className="w-full px-4 py-3 bg-white dark:bg-black rounded-2xl border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-4 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 transition-colors disabled:opacity-50 mt-2"
              >
                {submitting ? 'Creating Ad...' : 'Publish Advertisement'}
              </button>
            </form>
          )}

          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase ml-1">Active Campaigns</h3>
            
            {loading ? (
              <div className="h-20 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-3xl" />
            ) : ads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-8 text-center text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                <ChartBarIcon className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No active ads yet. Sell some space!</p>
              </div>
            ) : (
              ads.map(ad => (
                <div 
                  key={ad.id} 
                  onClick={() => setSelectedAd(ad)}
                  className="bg-white dark:bg-black p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-3 group cursor-pointer hover:border-violet-500 transition-all active:scale-[0.98]"
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex-none">
                    <Image src={ad.image_url} alt="" fill className="object-cover" unoptimized />
                    {ad.video_url && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <VideoCameraIcon className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow flex flex-col">
                    <span className="font-bold text-zinc-900 dark:text-white">{ad.title}</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <ChartBarIcon className="w-3 h-3" /> {ad.impressions_count} Impr.
                      </span>
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <PlusIcon className="w-3 h-3 rotate-45" /> {ad.clicks_count} Clicks
                      </span>
                      <span className="text-[10px] text-violet-500 font-bold uppercase">
                        CTR: {ad.impressions_count > 0 ? ((ad.clicks_count / ad.impressions_count) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteAd(ad.id, ad.image_url)
                    }}
                    className="p-3 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          <div className="px-2">
            <h2 className="text-xl font-black text-zinc-900 dark:text-white">Pending Applications</h2>
            <p className="text-zinc-500 text-sm mt-1">Review creators who reached 10M views & 10k followers.</p>
          </div>

          {loadingCreators ? (
            <div className="h-40 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-3xl" />
          ) : pendingCreators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center text-zinc-400 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
              <div className="w-16 h-16 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4 text-2xl">🏆</div>
              <p className="font-bold text-zinc-600 dark:text-zinc-400">All caught up!</p>
              <p className="text-sm mt-1">No pending applications at the moment.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {pendingCreators.map(p => (
                <div key={p.id} className="bg-white dark:bg-black p-4 rounded-[24px] border border-zinc-100 dark:border-zinc-800 flex items-center gap-4 transition-all hover:border-amber-200 dark:hover:border-amber-900/30">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-none">
                    {p.avatar_url && <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-bold text-[15px] truncate">{p.full_name}</p>
                    <p className="text-xs text-zinc-500 truncate">@{p.username}</p>
                  </div>
                  <div className="flex gap-2 flex-none">
                    <button 
                      onClick={() => handleCreatorAction(p.id, 'declined')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                      Decline
                    </button>
                    <button 
                      onClick={() => handleCreatorAction(p.id, 'approved')}
                      className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 text-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Ad Analytics Modal */}
      {selectedAd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div onClick={() => setSelectedAd(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <div className="relative bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Header with Ad Creative */}
            <div className="relative w-full aspect-video bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              {selectedAd.video_url ? (
                <video 
                  src={selectedAd.video_url} 
                  poster={selectedAd.image_url} 
                  className="w-full h-full object-cover" 
                  autoPlay 
                  muted 
                  loop 
                />
              ) : (
                <Image src={selectedAd.image_url} alt={selectedAd.title} fill className="object-cover" unoptimized />
              )}
              <button 
                onClick={() => setSelectedAd(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black/70 transition-colors z-10"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{selectedAd.title}</h2>
                <p className="text-zinc-500 text-sm mt-1">{selectedAd.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[10px] font-bold rounded-md uppercase tracking-wider">Active Campaign</span>
                  <span className="text-[10px] text-zinc-400 font-medium">Created {new Date(selectedAd.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Analytics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter mb-1">Total Views</span>
                  <span className="text-xl font-black text-zinc-900 dark:text-white">{selectedAd.impressions_count}</span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter mb-1">Total Clicks</span>
                  <span className="text-xl font-black text-zinc-900 dark:text-white">{selectedAd.clicks_count}</span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-violet-500 uppercase tracking-tighter mb-1">Overall CTR</span>
                  <span className="text-xl font-black text-violet-600">
                    {selectedAd.impressions_count > 0 ? ((selectedAd.clicks_count / selectedAd.impressions_count) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>

              {/* Advanced Calculation */}
              <div className="bg-violet-50/50 dark:bg-violet-900/10 p-5 rounded-3xl border border-violet-100 dark:border-violet-900/30 flex items-center gap-4">
                <div className="w-12 h-12 bg-white dark:bg-black rounded-2xl flex items-center justify-center text-xl shadow-sm flex-none">⚡</div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">Daily Growth</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    This ad is averaging <span className="text-violet-600 font-bold">
                      {Math.ceil(selectedAd.impressions_count / Math.max(1, Math.floor((Date.now() - new Date(selectedAd.created_at).getTime()) / (1000 * 60 * 60 * 24))))}
                    </span> impressions per day since launch.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => window.open(selectedAd.target_url, '_blank')}
                  className="flex-grow py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-sm transition-transform active:scale-95"
                >
                  Visit Destination
                </button>
                <button 
                  onClick={() => {
                    deleteAd(selectedAd.id, selectedAd.image_url)
                    setSelectedAd(null)
                  }}
                  className="px-6 py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition-colors"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
