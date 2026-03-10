const fs = require('fs')

let content = fs.readFileSync('src/app/settings/page.tsx', 'utf-8')

// 1. Import Suspense and useSearchParams
content = content.replace(
    "import React, { useState, useEffect } from 'react'",
    "import React, { useState, useEffect, Suspense } from 'react'"
)
content = content.replace(
    "import { useRouter } from 'next/navigation'",
    "import { useRouter, useSearchParams } from 'next/navigation'"
)

// 2. Rename default export to SettingsContent
content = content.replace(
    "export default function SettingsPage() {",
    "function SettingsContent() {"
)

// 3. Add useSearchParams logic
content = content.replace(
    "  const router = useRouter()\n  const supabase = createClient()",
    "  const router = useRouter()\n  const searchParams = useSearchParams()\n  const tabParam = searchParams.get('tab')\n  const supabase = createClient()"
)

content = content.replace(
    "  const [activeTab, setActiveTab] = useState('privacy')",
    "  const [activeTab, setActiveTab] = useState(tabParam || 'privacy')\n\n  useEffect(() => {\n    if (tabParam) setActiveTab(tabParam)\n  }, [tabParam])"
)

// 4. Add the new wrapper at the end of the file
const wrapper = `
export default function SettingsPage() {
  return (
    <Suspense fallback={<AppLayout><div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-zinc-200 border-t-black dark:border-t-white rounded-full animate-spin" /></div></AppLayout>}>
      <SettingsContent />
    </Suspense>
  )
}
`
content += wrapper

fs.writeFileSync('src/app/settings/page.tsx', content, 'utf-8')
console.log("Updated settings/page.tsx successfully!")
