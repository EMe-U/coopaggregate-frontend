import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ServerStatusNotice from './ServerStatusNotice'
import useServerStatus from '../hooks/useServerStatus'
import { refreshOfflineCache } from '../offline/cache'
import { startSync } from '../offline/sync'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // "Try again" after the server could not be reached opens the page again, so it loads again.
  const { retryKey } = useServerStatus()

  // Keep the members and grades saved on this device fresh for recording deliveries offline.
  useEffect(() => {
    if (navigator.onLine) refreshOfflineCache()
    window.addEventListener('online', refreshOfflineCache)
    return () => window.removeEventListener('online', refreshOfflineCache)
  }, [])

  useEffect(() => startSync(), [])

  return (
    <div className="flex h-screen print:block print:h-auto">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <ServerStatusNotice />
        {/* relative: screen-reader-only labels are absolutely positioned. Without a positioned
            ancestor they are placed against the page instead of this scroll area, and one far
            down a long page made the whole document scroll past the content. */}
        <main className="relative flex-1 overflow-y-auto p-4 pb-6 md:p-6 print:overflow-visible print:p-0">
          <Outlet key={retryKey} />
        </main>
      </div>
    </div>
  )
}
