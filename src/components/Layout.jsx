import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { refreshOfflineCache } from '../offline/cache'
import { startSync } from '../offline/sync'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
