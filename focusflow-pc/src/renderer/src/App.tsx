import React, { useState, useEffect, useCallback, useRef } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import TodayScreen from './screens/TodayScreen'
import WeekScreen from './screens/WeekScreen'
import FocusScreen from './screens/FocusScreen'
import StatsScreen from './screens/StatsScreen'
import SettingsScreen from './screens/SettingsScreen'
import ProfileScreen from './screens/ProfileScreen'
import ReportsScreen from './screens/ReportsScreen'
import ActiveScreen from './screens/ActiveScreen'
import NotesScreen from './screens/NotesScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import dayjs from 'dayjs'

type Tab = 'today' | 'week' | 'focus' | 'stats' | 'settings'
type Page = Tab | 'profile' | 'reports' | 'active' | 'notes'

const NAV_ITEMS: { id: Tab; label: string; icon: string; shortcut: string }[] = [
  { id: 'today',    label: 'Today',    icon: '📅', shortcut: '1' },
  { id: 'week',     label: 'Week',     icon: '📆', shortcut: '2' },
  { id: 'focus',    label: 'Focus',    icon: '🛡',  shortcut: '3' },
  { id: 'stats',    label: 'Stats',    icon: '📊', shortcut: '4' },
  { id: 'settings', label: 'Settings', icon: '⚙️', shortcut: '5' },
]

// ── Quick-Add Task Modal ──────────────────────────────────────────────────────
function getDefaultTime(): { date: string; time: string } {
  const now = dayjs()
  const mins = now.minute()
  const roundedMins = Math.ceil(mins / 15) * 15
  const rounded = roundedMins >= 60
    ? now.add(1, 'hour').minute(0).second(0)
    : now.minute(roundedMins).second(0)
  return {
    date: rounded.format('YYYY-MM-DD'),
    time: rounded.format('HH:mm'),
  }
}

const PRIORITY_OPTIONS = [
  { value: 'low',      label: 'Low',      color: '#6b7280' },
  { value: 'medium',   label: 'Medium',   color: '#6366f1' },
  { value: 'high',     label: 'High',     color: '#f59e0b' },
  { value: 'critical', label: 'Critical', color: '#ef4444' },
]

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120]

function QuickAddModal({ onClose }: { onClose: () => void }) {
  const { addTask } = useApp()
  const defaults = getDefaultTime()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaults.date)
  const [time, setTime] = useState(defaults.time)
  const [duration, setDuration] = useState(30)
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) { setError('Title is required'); titleRef.current?.focus(); return }
    setSaving(true)
    try {
      const startTime = dayjs(`${date}T${time}`).toISOString()
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
      const color = PRIORITY_OPTIONS.find(p => p.value === priority)?.color ?? '#6366f1'
      await addTask({ title: trimmed, startTime, durationMinutes: duration, priority, tags: tagList, color })
      onClose()
    } catch {
      setError('Failed to add task — please try again.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-14 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Escape') onClose() }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
              <span className="text-white text-sm font-black">+</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Quick Add Task</h2>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Ctrl+↵ to save · Esc to cancel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-sm transition-colors"
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4"
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit() }}>
          {/* Title */}
          <div>
            <input
              ref={titleRef}
              type="text"
              placeholder="What do you need to do?"
              value={title}
              onChange={e => { setTitle(e.target.value); setError('') }}
              className="w-full text-base font-semibold bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 outline-none border-b-2 border-gray-200 dark:border-gray-600 focus:border-indigo-500 pb-2 transition-colors"
              autoComplete="off"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Start Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Duration presets */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">Duration</label>
            <div className="flex gap-1.5 flex-wrap items-center">
              {DURATION_PRESETS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    duration === d
                      ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {d < 60 ? `${d}m` : `${d / 60}h`}
                </button>
              ))}
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="number"
                  min={5} max={480} step={5}
                  value={duration}
                  onChange={e => setDuration(Math.max(5, Number(e.target.value)))}
                  className="w-14 text-xs text-center text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-1 py-1.5 outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-gray-400">min</span>
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">Priority</label>
            <div className="flex gap-1.5">
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value as typeof priority)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${
                    priority === p.value
                      ? 'text-white border-transparent'
                      : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}
                  style={priority === p.value ? { backgroundColor: p.color, borderColor: p.color } : {}}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">
              Tags <span className="font-normal normal-case">(comma-separated, optional)</span>
            </label>
            <input
              type="text"
              placeholder="work, deep-work, meeting"
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors placeholder-gray-300 dark:placeholder-gray-600"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white text-sm font-bold transition-colors shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
            >{saving ? 'Adding…' : '+ Add Task'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Title bar ────────────────────────────────────────────────────────────────
function TitleBar({ isFocusing, onQuickAdd }: { isFocusing: boolean; onQuickAdd: () => void }) {
  const [isMax, setIsMax] = useState(false)

  const handleMaximize = async () => {
    await window.api.window.maximize()
    const max = await window.api.window.isMaximized()
    setIsMax(!!max)
  }

  return (
    <div
      className={`flex items-center border-b px-4 py-2 select-none transition-colors ${
        isFocusing
          ? 'bg-indigo-600 dark:bg-indigo-800 border-indigo-500'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
      }`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isFocusing ? 'bg-white/20' : 'bg-indigo-500'}`}>
          <span className="text-xs font-black text-white">F</span>
        </div>
        <span className={`text-sm font-bold ${isFocusing ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
          FocusFlow {isFocusing && <span className="font-normal opacity-80">— Focus Mode Active</span>}
        </span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Quick Add button always visible in title bar */}
        <button
          onClick={onQuickAdd}
          title="Quick Add Task (Ctrl+Shift+N)"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors mr-1 ${
            isFocusing
              ? 'bg-white/20 hover:bg-white/30 text-white'
              : 'bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
          }`}
        >
          <span className="text-sm leading-none">+</span>
          <span>Task</span>
        </button>
        <button
          onClick={() => window.api.window.minimize()}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
            isFocusing ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
          title="Minimize"
        >─</button>
        <button
          onClick={handleMaximize}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
            isFocusing ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
          title={isMax ? 'Restore' : 'Maximize'}
        >{isMax ? '❐' : '□'}</button>
        <button
          onClick={() => window.api.window.close()}
          className="w-6 h-6 rounded-full bg-red-400 hover:bg-red-500 flex items-center justify-center text-xs text-white transition-colors"
          title="Close to tray"
        >✕</button>
      </div>
    </div>
  )
}

// ── App Shell ────────────────────────────────────────────────────────────────
function AppShell() {
  const { state } = useApp()
  const [page, setPage] = useState<Page>('today')
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const isFocusing = !!state.focusSession

  const navigate = useCallback((p: Page) => {
    setPage(p)
    if (['today', 'week', 'focus', 'stats', 'settings'].includes(p)) setActiveTab(p as Tab)
  }, [])

  const openQuickAdd = useCallback(() => setShowQuickAdd(true), [])

  // Navigate events from main process (global shortcuts, tray)
  useEffect(() => {
    const handler = (p: unknown) => { if (typeof p === 'string') navigate(p as Page) }
    window.api.on('navigate', handler)
    return () => window.api.off('navigate', handler)
  }, [navigate])

  // Global Quick Add shortcut from main process (Ctrl+Shift+N)
  useEffect(() => {
    const handler = () => setShowQuickAdd(true)
    window.api.on('quickAdd:open', handler)
    return () => window.api.off('quickAdd:open', handler)
  }, [])

  // In-window keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if (isInput) return

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); setShowShortcuts(s => !s); return }
      if (e.key === 'Escape') { setShowShortcuts(false); setShowQuickAdd(false); return }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '1') navigate('today')
        else if (e.key === '2') navigate('week')
        else if (e.key === '3') navigate('focus')
        else if (e.key === '4') navigate('stats')
        else if (e.key === '5') navigate('settings')
        else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setShowQuickAdd(true) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  if (!state.isDbReady) {
    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        <TitleBar isFocusing={false} onQuickAdd={openQuickAdd} />
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
        <TitleBar isFocusing={false} onQuickAdd={openQuickAdd} />
        <OnboardingScreen />
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${isFocusing ? 'focus-mode-active' : ''}`}>
      <TitleBar isFocusing={isFocusing} onQuickAdd={openQuickAdd} />

      {/* Focus mode banner */}
      {isFocusing && (
        <div className="bg-indigo-500 dark:bg-indigo-700 px-4 py-1.5 flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-semibold text-white">Focus session active — stay on track!</span>
          <span className="ml-auto text-xs text-white/70">Press <kbd className="bg-white/20 border-white/30 text-white">3</kbd> to view timer</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`w-52 flex flex-col bg-white dark:bg-gray-900 border-r transition-colors sidebar-nav ${
          isFocusing ? 'border-indigo-300 dark:border-indigo-700' : 'border-gray-200 dark:border-gray-700'
        } py-4`}>
          <div className="px-4 mb-3">
            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Navigation</div>
          </div>

          <nav className="flex-1 px-2 space-y-0.5">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                title={`${item.label} (${item.shortcut})`}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  activeTab === item.id && page === item.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'focus' && isFocusing && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                <span className={`text-[10px] font-mono px-1 py-0.5 rounded border opacity-0 group-hover:opacity-60 transition-opacity ${
                  activeTab === item.id
                    ? 'border-indigo-300 dark:border-indigo-600 text-indigo-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-400'
                }`}>{item.shortcut}</span>
              </button>
            ))}
          </nav>

          <div className="px-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-0.5 mt-2">
            <div className="px-3 mb-2">
              <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">More</div>
            </div>
            {([
              { id: 'notes' as Page, label: 'Daily Notes', icon: '📝' },
              { id: 'active' as Page, label: 'Active Status', icon: '⚡' },
              { id: 'reports' as Page, label: 'Reports', icon: '📋' },
              { id: 'profile' as Page, label: 'Profile', icon: '👤' },
            ] as { id: Page; label: string; icon: string }[]).map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  page === item.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Quick Add shortcut button in sidebar */}
          <div className="px-3 pt-3">
            <button
              onClick={openQuickAdd}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 transition-colors"
            >
              <span className="text-sm">⚡</span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex-1 text-left">Quick Add</span>
              <kbd className="text-[9px] text-indigo-400 dark:text-indigo-500 border border-indigo-200 dark:border-indigo-700 rounded px-1">N</kbd>
            </button>
          </div>

          {/* Today progress + streak + shortcuts hint */}
          <div className="px-4 pt-3 space-y-2">
            <TodayProgressBar />
            <StreakChip />
            <button
              onClick={() => setShowShortcuts(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors py-1"
            >
              <kbd>?</kbd>
              <span>Shortcuts</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden page-enter">
          {page === 'today'    && <TodayScreen navigate={navigate} />}
          {page === 'week'     && <WeekScreen navigate={navigate} />}
          {page === 'focus'    && <FocusScreen navigate={navigate} />}
          {page === 'stats'    && <StatsScreen />}
          {page === 'settings' && <SettingsScreen navigate={navigate} />}
          {page === 'profile'  && <ProfileScreen onBack={() => navigate('settings')} />}
          {page === 'reports'  && <ReportsScreen onBack={() => navigate('stats')} />}
          {page === 'active'   && <ActiveScreen navigate={navigate} />}
          {page === 'notes'    && <NotesScreen />}
        </main>
      </div>

      {/* Keyboard shortcuts reference */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowShortcuts(false)}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-80 animate-bounce-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">⌨️ Keyboard Shortcuts</h3>
            <div className="space-y-2 text-sm">
              {([
                ['1–5', 'Switch tabs'],
                ['N', 'Quick Add Task'],
                ['?', 'Toggle this panel'],
                ['Esc', 'Close modals'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{v}</span>
                  <kbd>{k}</kbd>
                </div>
              ))}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Global (from anywhere)</p>
                {([
                  ['Ctrl+Shift+Space', 'Show / Hide window'],
                  ['Ctrl+Shift+N', 'Quick Add Task'],
                  ['Ctrl+Shift+1', 'Today'],
                  ['Ctrl+Shift+2', 'Week View'],
                  ['Ctrl+Shift+3', 'Focus'],
                  ['Ctrl+Shift+4', 'Stats'],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between mt-1.5">
                    <span className="text-gray-600 dark:text-gray-400 text-xs">{v}</span>
                    <kbd className="text-[10px]">{k}</kbd>
                  </div>
                ))}
              </div>
            </div>
            <button
              className="mt-4 w-full py-2 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors"
              onClick={() => setShowShortcuts(false)}
            >Got it</button>
          </div>
        </div>
      )}

      {/* Global Quick Add Modal — works from any screen or global shortcut */}
      {showQuickAdd && <QuickAddModal onClose={() => setShowQuickAdd(false)} />}
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

function TodayProgressBar() {
  const { todayTasks } = useApp()
  const done  = todayTasks.filter(t => t.status === 'completed').length
  const total = todayTasks.length
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#6366f1' : '#f59e0b'
  return (
    <div className="px-3 pb-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">Today</span>
        <span className="text-[10px] font-bold" style={{ color }}>{done}/{total}</span>
      </div>
      <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
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
