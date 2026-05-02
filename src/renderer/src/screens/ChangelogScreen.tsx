import React, { useState } from 'react'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy'

interface ChangelogEntry {
  version: string
  date: string
  badge?: 'new' | 'fix' | 'pc'
  sections: { heading: string; icon: string; items: string[] }[]
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: 'May 2026',
    badge: 'pc',
    sections: [
      {
        heading: 'Block Defense Screen',
        icon: '🛡',
        items: [
          'New dedicated Block Enforcement screen — all layers in one place',
          'Full website blocking list with per-site on/off toggle',
          'Recurring Block Schedules — set time windows (e.g. Mon–Fri 9–17) that block specific sites automatically, no session needed',
          'Focus Session Behaviour toggle: keep blocking active for the full task duration even if you finish early',
          'Aversion Sound deterrent toggle — a startling audio cue fires when you hit a blocked site',
        ],
      },
      {
        heading: 'Keyword Blocker Screen',
        icon: '🔤',
        items: [
          'Dedicated full-page keyword blocker with 6 quick-add presets: Doomscroll bait, Social-media drama, Shorts/Reels bait, Impulse-buy traps, Gambling triggers, NSFW content',
          'Custom keyword editor modal with real-time chip display',
          'One-tap remove any keyword from the main page',
          'Privacy notice — all matching is done locally, nothing sent to servers',
        ],
      },
      {
        heading: 'Always-On Block List',
        icon: '♾️',
        items: [
          'New Always-On Block List screen — add domains to block 24/7 with no timer or session needed',
          'Quick preset groups for Social Media, Video, News/Outrage, Shopping',
          'Separate from the focus-session block list — explained side-by-side in the UI',
          'Toggle to enable/disable always-on enforcement without clearing the list',
        ],
      },
      {
        heading: 'Active Status Screen',
        icon: '⚡',
        items: [
          'Active Status screen now shows all 5 enforcement layers with live status badges',
          'Real-time detection of block schedules currently in their active window — amber banner with schedule details',
          '"LIVE" badge on any schedule running right now',
          'Direct Edit navigation from each enforcement layer row',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    date: 'April 2026',
    badge: 'new',
    sections: [
      {
        heading: 'Core Productivity Engine',
        icon: '⏱',
        items: [
          'Task-based focus sessions with configurable start time and duration',
          'Priority levels: critical, high, medium, low — colour-coded throughout',
          'Pomodoro timer with configurable work/break intervals',
          'Today timeline view — drag tasks, see overlaps, add tasks by clicking on empty time slots',
          'Week view with daily task summary cards',
        ],
      },
      {
        heading: 'Focus & Blocking',
        icon: '🛡',
        items: [
          'Focus Mode activates enforcement for the duration of a task',
          'Website blocking list — track and block distracting domains during sessions',
          'Keyword blocker — flag content matching specific words in browser activity',
          'Aversion Sound deterrent',
          'Standalone timed blocks with countdown',
        ],
      },
      {
        heading: 'Stats & Reports',
        icon: '📊',
        items: [
          'Stats screen: today, yesterday, week, all-time focus minutes, completion rate, override count',
          'Productivity Score (A+–F graded) using completion %, focus time, and override penalties',
          'Streak tracking — consecutive days with completed tasks',
          'Reports screen: focus-time hero, task breakdown (on-time / late / skipped), weekly heatmap',
          'Daily completion history bar chart',
        ],
      },
      {
        heading: 'Settings & Profile',
        icon: '⚙️',
        items: [
          'Full user profile: name, occupation, chronotype, sleep time, focus goals, distraction triggers',
          'Dark mode support',
          'Backup export to JSON — all tasks and settings',
          'Weekly report notification',
          'Onboarding flow for first-run setup',
        ],
      },
      {
        heading: 'PC-Specific Features',
        icon: '🖥',
        items: [
          'Electron 29 desktop app — native window controls, system tray',
          'SQLite database (WAL mode) for fast local storage',
          'Global keyboard shortcuts (Ctrl+Shift+1–4 for navigation, Ctrl+Shift+Space to show/hide)',
          'Frameless window with custom title bar',
          'Daily Notes screen with local persistence',
        ],
      },
    ],
  },
]

const BADGE_STYLES: Record<string, string> = {
  new: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
  fix: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  pc: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
}
const BADGE_LABEL: Record<string, string> = { new: 'New', fix: 'Fix', pc: 'PC Update' }

export default function ChangelogScreen({ navigate }: { navigate: (p: Page) => void }) {
  const [expanded, setExpanded] = useState<string>(CHANGELOG[0].version)

  const toggle = (v: string) => setExpanded(prev => prev === v ? '' : v)

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('settings')}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">What's New</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">FocusFlow-PC — version history</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {CHANGELOG.map((entry, idx) => {
          const isOpen = expanded === entry.version
          return (
            <div
              key={entry.version}
              className={`rounded-2xl border overflow-hidden transition-all ${
                isOpen
                  ? 'border-indigo-200 dark:border-indigo-700'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <button
                onClick={() => toggle(entry.version)}
                className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors ${
                  isOpen
                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isOpen ? 'bg-indigo-500' : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <span className={`text-xs font-black ${isOpen ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                    {entry.version.startsWith('1.') ? 'v' + entry.version : entry.version}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Version {entry.version}</span>
                    {idx === 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400">
                        LATEST
                      </span>
                    )}
                    {entry.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BADGE_STYLES[entry.badge]}`}>
                        {BADGE_LABEL[entry.badge]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{entry.date}</p>
                </div>
                <span className="text-gray-400 text-sm flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {entry.sections.map((section, si) => (
                    <div key={si} className="px-4 py-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{section.icon}</span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{section.heading}</span>
                      </div>
                      <ul className="space-y-2">
                        {section.items.map((item, ii) => (
                          <li key={ii} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                            <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
          All data stays on your device — nothing is sent to any server.
        </p>
      </div>
    </div>
  )
}
