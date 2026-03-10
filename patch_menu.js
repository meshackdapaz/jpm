const fs = require('fs')

// Profile page update
let profileContent = fs.readFileSync('src/app/profile/page.tsx', 'utf-8')

const oldMenu = `              {[
                { label: 'Follow and invite friends', icon: UserPlusIcon, href: '/settings' },
                { label: 'Notifications', icon: BellIcon, href: '/notifications' },
                { label: 'Saved', icon: BookmarkIcon, href: '/profile' },
                { label: 'Liked', icon: HeartIcon, href: '/profile' },
                { label: 'Archive', icon: ClockIcon, href: '/profile' },
                { label: 'Privacy', icon: LockClosedIcon, href: '/settings?tab=privacy' },
                { label: 'Content preferences', icon: AdjustmentsVerticalIcon, href: '/settings?tab=appearance' },
                { label: 'Account', icon: UserCircleIcon, href: '/settings?tab=status' },
                { label: 'Help', icon: QuestionMarkCircleIcon, href: '/settings?tab=help' },
                { label: 'About', icon: InformationCircleIcon, href: '/settings?tab=help' },
              ].map((item, idx) => (`

const newMenu = `              {[
                { label: 'Follow and invite friends', icon: UserPlusIcon, href: '/settings' },
                { label: 'Notifications', icon: BellIcon, href: '/notifications' },
                { label: 'Saved', icon: BookmarkIcon, href: '/profile' },
                { label: 'Liked', icon: HeartIcon, href: '/profile' },
                { label: 'Archive', icon: ClockIcon, href: '/profile' },
                { label: 'Privacy', icon: LockClosedIcon, href: '/settings?tab=privacy' },
                { label: 'Account', icon: UserCircleIcon, href: '/settings?tab=status' },
                { label: 'Help', icon: QuestionMarkCircleIcon, href: '/settings?tab=help' },
                { label: 'About App', icon: InformationCircleIcon, href: '/settings?tab=about' },
              ].map((item, idx) => (`

profileContent = profileContent.replace(oldMenu, newMenu)
fs.writeFileSync('src/app/profile/page.tsx', profileContent, 'utf-8')

// Settings page update
let settingsContent = fs.readFileSync('src/app/settings/page.tsx', 'utf-8')

// Add import for InformationCircleIcon 
settingsContent = settingsContent.replace(
    "} from '@heroicons/react/24/solid'",
    "  InformationCircleIcon\n} from '@heroicons/react/24/solid'"
)

// Add menu item
const oldLeftMenu = `  const leftMenu = [
    { id: 'privacy',    label: 'Privacy',         icon: LockClosedIcon },
    { id: 'status',     label: 'Edit Profile',     icon: UserIcon },
    { id: 'appearance', label: 'Appearance',       icon: SunIcon },
    { id: 'help',       label: 'Help',             icon: QuestionMarkCircleIcon },
  ]`

const newLeftMenu = `  const leftMenu = [
    { id: 'privacy',    label: 'Privacy',         icon: LockClosedIcon },
    { id: 'status',     label: 'Edit Profile',     icon: UserIcon },
    { id: 'appearance', label: 'Appearance',       icon: SunIcon },
    { id: 'help',       label: 'Help',             icon: QuestionMarkCircleIcon },
    { id: 'about',      label: 'About App',        icon: InformationCircleIcon },
  ]`

settingsContent = settingsContent.replace(oldLeftMenu, newLeftMenu)

// Add tab content
const oldHelpTab = `            {/* HELP TAB */}
            {activeTab === 'help' && (
              <div className="p-4 sm:p-8 animate-in fade-in duration-200">
                <h2 className="font-bold text-2xl mb-4">Help Center</h2>
                <p className="text-zinc-500">Contact support or view our FAQ.</p>
              </div>
            )}`

const newHelpTab = `            {/* HELP TAB */}
            {activeTab === 'help' && (
              <div className="p-4 sm:p-8 animate-in fade-in duration-200">
                <h2 className="font-bold text-2xl mb-4">Help Center</h2>
                <p className="text-zinc-500 mb-6">Contact support or view our FAQ.</p>
                <div className="space-y-4 text-[16px]">
                  <p><strong>Support Email:</strong> meshackurassa2@gmail.com</p>
                </div>
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="p-4 sm:p-8 animate-in fade-in duration-200">
                <h2 className="font-bold text-2xl mb-6">About App</h2>
                <div className="space-y-4 text-[16px] bg-zinc-50 dark:bg-zinc-900 rounded-xl p-6 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold">
                      D
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">Builders</p>
                      <p className="text-zinc-500">dapazcm 2026</p>
                    </div>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      @
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">Help & Support System</p>
                      <a href="mailto:meshackurassa2@gmail.com" className="text-blue-500 hover:underline">meshackurassa2@gmail.com</a>
                    </div>
                  </div>
                </div>
              </div>
            )}`

settingsContent = settingsContent.replace(oldHelpTab, newHelpTab)

fs.writeFileSync('src/app/settings/page.tsx', settingsContent, 'utf-8')
console.log("Updated both files successfully!")
