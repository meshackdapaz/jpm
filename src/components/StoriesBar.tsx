'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'
import Image from 'next/image'
import { PlusIcon } from '@heroicons/react/24/solid'
import { StoryViewer } from './StoryViewer'
import { StoryCreator } from './StoryCreator'
import { motion } from 'framer-motion'

export function StoriesBar() {
  const { user } = useAuth()
  const supabase = createClient()
  const [groups, setGroups] = useState<{ profile: any; stories: any[]; hasUnseen: boolean }[]>([])
  const [viewerData, setViewerData] = useState<{ stories: any[]; startIndex: number } | null>(null)
  const [showCreator, setShowCreator] = useState(false)

  const fetchStories = useCallback(async () => {
    const { data } = await supabase
      .from('stories')
      .select('id, creator_id, image_url, bg_color, expires_at, created_at, view_count, text_content, profiles:creator_id(id, full_name, username, avatar_url)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(60)

    if (!data) return

    let seenIds = new Set<string>()
    if (user) {
      const { data: views } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', user.id)
      views?.forEach((v: any) => seenIds.add(v.story_id))
    }

    const map = new Map<string, any>()
    for (const s of data) {
      const cid = s.creator_id
      if (!map.has(cid)) map.set(cid, { profile: s.profiles, stories: [], hasUnseen: false })
      const g = map.get(cid)
      s.is_seen = seenIds.has(s.id)
      g.stories.push(s)
      if (!seenIds.has(s.id)) g.hasUnseen = true
    }

    const result = Array.from(map.values())
    if (user) result.sort((a, b) => (a.profile?.id === user.id ? -1 : b.profile?.id === user.id ? 1 : 0))
    setGroups(result)
  }, [user])

  useEffect(() => { fetchStories() }, [fetchStories])

  if (groups.length === 0 && !user) return null

  const myStory = groups.find(g => g.profile?.id === user?.id) || null

  return (
    <>
      <div
        className="flex items-center gap-4 px-4 py-4 overflow-x-auto bg-white dark:bg-black border border-zinc-100 dark:border-zinc-900 sm:rounded-xl mb-4"
        style={{ scrollbarWidth: 'none' }}
      >
        {user && (
          <div className="flex flex-col items-center gap-1.5 flex-none">
            <div className="relative w-[58px] h-[58px]">
              {myStory ? (
                <>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setViewerData({ stories: myStory.stories, startIndex: 0 })}
                    className="w-full h-full rounded-full overflow-hidden ring-2 ring-black dark:ring-white ring-offset-1 ring-offset-white dark:ring-offset-black"
                  >
                    {myStory.profile?.avatar_url ? (
                      <Image src={myStory.profile.avatar_url} alt="" width={58} height={58} className="object-cover w-full h-full" unoptimized />
                    ) : (
                      <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-lg font-black text-zinc-600 dark:text-zinc-300">
                        {myStory.profile?.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => setShowCreator(true)}
                    className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-black dark:bg-white rounded-full border-2 border-white dark:border-black flex items-center justify-center shadow-md z-10"
                  >
                    <PlusIcon className="w-3.5 h-3.5 text-white dark:text-black font-bold" />
                  </motion.button>
                </>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setShowCreator(true)}
                  className="w-full h-full rounded-full bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <PlusIcon className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                </motion.button>
              )}
            </div>
            <span className="text-[10px] font-semibold text-zinc-500 truncate max-w-[58px]">Your story</span>
          </div>
        )}

        {/* Other users' stories */}
        {groups
          .filter(g => !user || g.profile?.id !== user.id)
          .map(group => (
            <motion.button
              key={group.profile?.id}
              whileTap={{ scale: 0.92 }}
              className="flex flex-col items-center gap-1.5 flex-none"
              onClick={() => setViewerData({ stories: group.stories, startIndex: 0 })}
            >
              <div className="relative w-[58px] h-[58px]">
                {group.hasUnseen ? (
                  /* Unseen — Premium gradient ring */
                  <div className="w-full h-full p-[2.5px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                    <div className="w-full h-full rounded-full ring-2 ring-white dark:ring-black overflow-hidden bg-white dark:bg-black p-[1px]">
                      {group.profile?.avatar_url ? (
                        <Image src={group.profile.avatar_url} alt="" width={58} height={58} className="object-cover w-full h-full rounded-full" unoptimized />
                      ) : (
                        <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-lg font-black text-zinc-600">
                          {group.profile?.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Seen — thin subtle ring */
                  <div className="w-full h-full rounded-full p-[2.5px]">
                    <div className="w-full h-full rounded-full ring-1 ring-zinc-200 dark:ring-zinc-800 overflow-hidden opacity-60">
                      {group.profile?.avatar_url ? (
                        <Image src={group.profile.avatar_url} alt="" width={58} height={58} className="object-cover w-full h-full rounded-full grayscale-[0.3]" unoptimized />
                      ) : (
                        <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-lg font-black text-zinc-600">
                          {group.profile?.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 truncate max-w-[58px]">
                {group.profile?.full_name?.split(' ')[0] || group.profile?.username}
              </span>
            </motion.button>
          ))
        }

        {groups.length === 0 && user && (
          <p className="text-xs text-zinc-400 pl-1 py-2">No stories yet. Be the first!</p>
        )}
      </div>

      {viewerData && (
        <StoryViewer
          stories={viewerData.stories}
          startIndex={viewerData.startIndex}
          onClose={() => { setViewerData(null); fetchStories() }}
        />
      )}

      {showCreator && (
        <StoryCreator
          onClose={() => setShowCreator(false)}
          onCreated={() => fetchStories()}
        />
      )}
    </>
  )
}
