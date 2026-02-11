import { NavLink } from 'react-router-dom'
import { useModelStatus } from '../../hooks/useModelStatus'

const navItems = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/playground', label: 'Playground', icon: PlaygroundIcon },
  { to: '/echo', label: 'Echo', icon: EchoIcon },
  { to: '/voicecraft', label: 'VoiceCraft', icon: VoiceCraftIcon },
  { to: '/narrator', label: 'Narrator', icon: NarratorIcon },
]

export default function Sidebar() {
  const { isReady, isLoading } = useModelStatus()

  return (
    <aside className="sticky top-0 h-screen w-[var(--sidebar-width)] shrink-0 bg-zinc-925 border-r border-zinc-800 flex flex-col z-50">
      <div className="p-5 border-b border-zinc-800">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-gradient bg-gradient-to-r from-violet-400 to-pink-400">
            Chatterbox
          </span>
          <span className="text-zinc-400 font-normal ml-1.5 text-sm">TTS</span>
        </h1>
        <p className="text-[11px] text-zinc-500 mt-1">100% in-browser voice synthesis</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isReady ? 'bg-green-500' : isLoading ? 'bg-amber-500 animate-pulse' : 'bg-zinc-600'
            }`}
          />
          <span className="text-xs text-zinc-500">
            {isReady ? 'Model Ready' : isLoading ? 'Loading...' : 'Not Loaded'}
          </span>
        </div>
      </div>
    </aside>
  )
}

function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function PlaygroundIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function EchoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function VoiceCraftIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function NarratorIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

