import React, { useState } from 'react'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy'

interface GuideSection {
  icon: string
  title: string
  color: string
  steps: { heading: string; body: string }[]
}

const GUIDE: GuideSection[] = [
  {
    icon: '📅',
    title: 'Schedule Your Focus',
    color: '#6366f1',
    steps: [
      { heading: 'Add a task', body: 'Click the + button on the Today screen. Give it a name, set a start time and duration, and choose a priority level. Press Save.' },
      { heading: 'Set priority', body: 'Tasks are colour-coded: critical (red), high (orange), medium (indigo), low (grey). Higher-priority tasks surface first in the list.' },
      { heading: 'Timeline view', body: 'Switch to Timeline mode to see all tasks on a time axis. Click an empty slot to add a task at that time.' },
      { heading: 'Start focusing', body: 'When a task is active, the Focus tab lights up. Press Start Focus Mode to activate enforcement and the timer.' },
    ],
  },
  {
    icon: '🛡',
    title: 'Block Distractions',
    color: '#ef4444',
    steps: [
      { heading: 'Website blocking', body: 'Open Block Defense → Website Blocking. Add domains (e.g. twitter.com) and toggle blocking on. Blocked during focus sessions.' },
      { heading: 'Always-On block list', body: 'For sites you want blocked 24/7 — no session needed — go to Block Defense → Always-On Block List. Domains here stay blocked until you remove them.' },
      { heading: 'Block Schedules', body: 'Create recurring time windows (e.g. Mon–Fri 9–17) that block specific websites automatically — even without an active focus session.' },
      { heading: 'Keyword Blocker', body: 'Add words to the Keyword Blocker. When those words appear in browser tab URLs or window titles, FocusFlow logs them as distraction events in your reports.' },
    ],
  },
  {
    icon: '⚡',
    title: 'Enforcement Layers',
    color: '#f59e0b',
    steps: [
      { heading: 'Active Status screen', body: 'Open Active Status from the sidebar to see all enforcement layers at a glance — focus session, website blocking, keyword blocker, block schedules, and Pomodoro.' },
      { heading: 'Block Schedules live detection', body: 'If a block schedule is currently running, the Active Status screen shows an amber alert with the schedule name and when it ends.' },
      { heading: 'Aversion Sound', body: 'Turn on Aversion Sound in Block Defense to play a startling sound when you visit a blocked site — builds a negative reflex over time.' },
      { heading: 'Focus Session Behaviour', body: 'In Block Defense, toggle "Keep focus active for the full duration" to keep enforcement running until the original task end time — even if you finish early.' },
    ],
  },
  {
    icon: '🍅',
    title: 'Pomodoro Timer',
    color: '#ef4444',
    steps: [
      { heading: 'Enable in Settings', body: 'Go to Settings → Focus & Pomodoro and turn on Pomodoro mode. Set your focus duration (default 25m) and break length (default 5m).' },
      { heading: 'Automatic cycles', body: 'The Focus screen cycles through work and break intervals automatically. Each interval is logged separately in your stats.' },
      { heading: 'Pair with tasks', body: 'Start a focus session from a task on the Today screen — the Pomodoro timer will run alongside the task timer.' },
    ],
  },
  {
    icon: '📊',
    title: 'Track Progress',
    color: '#10b981',
    steps: [
      { heading: 'Stats screen', body: 'Shows today, yesterday, week, and all-time focus minutes, completion rate, override count, and a Productivity Score (A+–F).' },
      { heading: 'Reports screen', body: "Detailed report with task breakdown: on-time, late, early, extended, skipped. Daily completion chart and focus-time history." },
      { heading: 'Streak tracking', body: 'A streak chip in the sidebar shows your consecutive-day streak. Check your best streak and all-time focus hours in Reports.' },
    ],
  },
  {
    icon: '⌨️',
    title: 'Keyboard Shortcuts',
    color: '#3b82f6',
    steps: [
      { heading: 'In-window shortcuts', body: 'Press 1–5 to jump between tabs (Today, Week, Focus, Stats, Settings). Press ? to open the shortcuts panel.' },
      { heading: 'Global shortcuts', body: 'Ctrl+Shift+Space shows/hides the window from anywhere. Ctrl+Shift+1–4 navigate while the window is hidden.' },
      { heading: 'System tray', body: 'FocusFlow lives in the system tray. Right-click for quick access to focus controls and navigation — it\'s always one click away.' },
    ],
  },
  {
    icon: '⚙️',
    title: 'Settings & Profile',
    color: '#8b5cf6',
    steps: [
      { heading: 'Profile', body: 'Set your name, occupation, chronotype, daily focus goal, sleep time, distraction triggers, and preferred focus block length. Your profile shapes smart defaults throughout the app.' },
      { heading: 'Backup & Export', body: 'Go to Settings → Backup to export all tasks and settings to a JSON file. Store it safely — it\'s your only backup.' },
      { heading: 'Dark mode', body: 'Toggle dark mode in Settings. Dark mode is recommended for long focus sessions to reduce eye strain.' },
    ],
  },
]

export default function HowToUseScreen({ navigate }: { navigate: (p: Page) => void }) {
  const [expanded, setExpanded] = useState<number | null>(0)

  const toggle = (i: number) => setExpanded(prev => prev === i ? null : i)

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
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">How to Use FocusFlow</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Your discipline operating system — explained</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-3 flex gap-2 items-start mb-2">
          <span className="text-base mt-0.5">ℹ️</span>
          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            These guide sections cover all major features. Expand any section to read the steps. All data stays on your device — nothing is ever sent to a server.
          </p>
        </div>

        {GUIDE.map((section, i) => {
          const isOpen = expanded === i
          return (
            <div
              key={i}
              className={`rounded-2xl border overflow-hidden transition-all ${
                isOpen
                  ? 'border-indigo-200 dark:border-indigo-700'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <button
                onClick={() => toggle(i)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                  isOpen
                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: section.color + '20' }}
                >
                  {section.icon}
                </div>
                <span className="flex-1 text-sm font-bold text-gray-800 dark:text-gray-100">{section.title}</span>
                <span className="text-gray-400 dark:text-gray-500 text-sm">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                  {section.steps.map((step, j) => (
                    <div key={j} className="flex gap-3 px-4 py-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: section.color }}
                      >
                        <span className="text-white text-[10px] font-bold">{j + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-0.5">{step.heading}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{step.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
          All data stays on your device — nothing is sent to any server.
        </p>
      </div>
    </div>
  )
}
