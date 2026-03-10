import re

with open('src/app/profile/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add useRouter import
content = content.replace(
    "import { useSearchParams } from 'next/navigation'",
    "import { useSearchParams, useRouter } from 'next/navigation'"
)

# 2. Add router instance
content = content.replace(
    "  const searchParams = useSearchParams()",
    "  const searchParams = useSearchParams()\n  const router = useRouter()"
)

# 3. Replace the map to handle navigation
old_map = """            <div className="divide-y divide-zinc-50 dark:divide-zinc-900/50">
              {[
                { label: 'Follow and invite friends', icon: UserPlusIcon },
                { label: 'Notifications', icon: BellIcon },
                { label: 'Saved', icon: BookmarkIcon },
                { label: 'Liked', icon: HeartIcon },
                { label: 'Archive', icon: ClockIcon },
                { label: 'Privacy', icon: LockClosedIcon },
                { label: 'Content preferences', icon: AdjustmentsVerticalIcon },
                { label: 'Account', icon: UserCircleIcon },
                { label: 'Help', icon: QuestionMarkCircleIcon },
                { label: 'About', icon: InformationCircleIcon },
              ].map((item, idx) => (
                <button key={idx} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors group">
                  <item.icon className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
                  <span className="text-[17px] font-medium text-zinc-900 dark:text-zinc-100 flex-grow text-left">{item.label}</span>
                </button>
              ))}
            </div>"""

new_map = """            <div className="divide-y divide-zinc-50 dark:divide-zinc-900/50">
              {[
                { label: 'Follow and invite friends', icon: UserPlusIcon, href: '/settings' },
                { label: 'Notifications', icon: BellIcon, href: '/notifications' },
                { label: 'Saved', icon: BookmarkIcon, href: '/profile' },
                { label: 'Liked', icon: HeartIcon, href: '/profile' },
                { label: 'Archive', icon: ClockIcon, href: '/profile' },
                { label: 'Privacy', icon: LockClosedIcon, href: '/settings' },
                { label: 'Content preferences', icon: AdjustmentsVerticalIcon, href: '/settings' },
                { label: 'Account', icon: UserCircleIcon, href: '/settings' },
                { label: 'Help', icon: QuestionMarkCircleIcon, href: '/settings' },
                { label: 'About', icon: InformationCircleIcon, href: '/settings' },
              ].map((item, idx) => (
                <button 
                  key={idx} 
                  onClick={() => {
                    setIsSettingsOpen(false)
                    router.push(item.href)
                  }}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 active:scale-95 transition-all group"
                >
                  <item.icon className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
                  <span className="text-[17px] font-medium text-zinc-900 dark:text-zinc-100 flex-grow text-left">{item.label}</span>
                </button>
              ))}
            </div>"""

content = content.replace(old_map, new_map)

# 4. Remove Switch Profiles since we don't have multi-account support
old_actions = """            {/* Bottom Actions */}
            <div className="px-5 py-6 space-y-6 mt-2">
              <button className="text-[17px] font-bold text-blue-500 block">Switch profiles</button>
              <button 
                onClick={async () => {
                   await supabase.auth.signOut()
                   window.location.href = '/login'
                }}
                className="text-[17px] font-bold text-red-500 block"
              >
                Log out
              </button>
            </div>"""

new_actions = """            {/* Bottom Actions */}
            <div className="px-5 py-6 mt-2">
              <button 
                onClick={async () => {
                   await supabase.auth.signOut()
                   window.location.href = '/login'
                }}
                className="text-[17px] font-bold text-red-500 active:scale-95 transition-all outline-none w-full text-left"
              >
                Log out
              </button>
            </div>"""

content = content.replace(old_actions, new_actions)

with open('src/app/profile/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated profile/page.tsx successfully!")
