import React, { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import TodayScreen from './screens/TodayScreen'
import FocusScreen from './screens/FocusScreen'
import StatsScreen from './screens/StatsScreen'
import SettingsScreen from './screens/SettingsScreen'
import ProfileScreen from './screens/ProfileScreen'
import ReportsScreen from './screens/ReportsScreen'
import ActiveScreen from './screens/ActiveScreen'
import OnboardingScreen from './screens/OnboardingScreen'

type Tab = 'today' | 'focus' | 'stats' | 'settings'
type Page = Tab | 'profile' | 'reports' | 'active'

const NAV_ITEMS = [
  { id: 'today' as Tab, label: 'Today', icon: '📅' },
  { id: 'focus' as Tab, label: 'Focus', icon: '🛡' },
  { id: 'stats' as Tab, label: 'Stats', icon: '📊' },
  { id: 'settings' as Tab, label: 'Settings', icon: '⚙️' },
]

function TitleBar() {
  return (
    <div className="flex items-center bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2 select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">F</span>
        </div>
        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">FocusFlow</span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button onClick={() => window.api.window.minimize()} className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 transition-colors">─</button>
        <button onClick={() => window.api.window.maximize()} className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 transition-colors">□</button>
        <button onClick={() => window.api.window.close()} className="w-6 h-6 rounded-full bg-red-400 hover:bg-red-500 flex items-center justify-center text-xs text-white transition-colors">✕</button>
      </div>
    </div>
  )
}

function AppShell() {
  const { state } = useApp()
  const [page, setPage] = useState<Page>('today')
  const [activeTab, setActiveTab] = useState<Tab>('today')

  if (!state.isDbReady) {
    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Loading FocusFlow…</p>
          </div>
        </div>
      </div>
    )
  }

  if (!state.settings.onboardingComplete) {
    return (
      <div className="flex flex-col h-full">
        <TitleBar />
        <OnboardingScreen />
      </div>
    )
  }

  const navigate = (p: Page) => {
    setPage(p)
    if (['today','focus','stats','settings'].includes(p)) setActiveTab(p as Tab)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 py-4">
          <div className="px-4 mb-6">
            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Navigation</div>
          </div>
          <nav className="flex-1 px-2 space-y-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === item.id && page === item.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
                {item.id === 'focus' && state.focusSession && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </button>
            ))}
          </nav>
          <div className="px-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1 mt-2">
            <div className="px-4 mb-2">
              <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">More</div>
            </div>
            {[
              { id: 'active' as Page, label: 'Active Status', icon: '⚡' },
              { id: 'reports' as Page, label: 'Reports', icon: '📋' },
              { id: 'profile' as Page, label: 'Profile', icon: '👤' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  page === item.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
          {/* Streak chip */}
          <div className="px-4 pt-4">
            <StreakChip />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {page === 'today' && <TodayScreen navigate={navigate} />}
          {page === 'focus' && <FocusScreen navigate={navigate} />}
          {page === 'stats' && <StatsScreen />}
          {page === 'settings' && <SettingsScreen navigate={navigate} />}
          {page === 'profile' && <ProfileScreen onBack={() => navigate('settings')} />}
          {page === 'reports' && <ReportsScreen onBack={() => navigate('stats')} />}
          {page === 'active' && <ActiveScreen navigate={navigate} />}
        </main>
      </div>
    </div>
  )
}

function StreakChip() {
  const [streak, setStreak] = React.useState(0)
  React.useEffect(() => {
    window.api.stats.getStreak().then(setStreak).catch(() => {})
  }, [])
  if (streak === 0) return null
  return (
    <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-3 py-2">
      <span className="text-base">🔥</span>
      <div>
        <div className="text-xs font-bold text-orange-600 dark:text-orange-400">{streak}-day streak!</div>
        <div className="text-[10px] text-orange-500/70 dark:text-orange-400/60">Keep it up</div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
