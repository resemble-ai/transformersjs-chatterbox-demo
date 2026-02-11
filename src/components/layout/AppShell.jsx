import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import GitHubBanner from './GitHubBanner'

export default function AppShell() {
  return (
    <div className="flex flex-col min-h-screen">
      <GitHubBanner />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
