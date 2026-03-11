'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("SEARCH RENDER ERROR:", error)
  }, [error])

  return (
    <div className="flex flex-col items-start justify-center min-h-screen p-8 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100">
      <h2 className="text-2xl font-bold mb-4">React Render Crash Detected 🔥</h2>
      <div className="mb-4 text-lg font-mono p-4 bg-white dark:bg-black rounded-lg w-full overflow-x-auto shadow-md">
        {error.message || 'Unknown Error Message'}
      </div>
      <div className="text-xs font-mono opacity-70 p-4 bg-black/10 dark:bg-white/10 rounded-lg w-full overflow-x-auto max-h-96">
        {error.stack || 'No Stack Trace Provided'}
      </div>
      <button
        onClick={() => reset()}
        className="mt-8 px-6 py-3 bg-red-600 dark:bg-red-500 text-white font-bold rounded-xl"
      >
        Retry Render
      </button>
      <button
        onClick={() => window.history.back()}
        className="mt-4 px-6 py-3 bg-zinc-200 dark:bg-zinc-800 font-bold rounded-xl text-black dark:text-white"
      >
        Go Back
      </button>
    </div>
  )
}
