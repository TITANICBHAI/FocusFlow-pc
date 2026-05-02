import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { AppSettings } from '../data/types'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy' | 'standalone-block'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">{title}</p>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">{children}</div>
    </div>
  )
}

function Row({ label, desc, children }: { label: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</p>
        {desc && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

function BtnRow({ icon, label, desc, danger, onClick }: { icon: string; label: string; desc?: string; danger?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${danger ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>{label}</p>
        {desc && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <span className="text-gray-300 dark:text-gray-600 text-sm">›</span>
    </button>
  )
}

function BlockedSitesModal({ settings, onSave, onClose }: { settings: AppSettings; onSave: (s: AppSettings) => void; onClose: () => void }) {
  const [sites, setSites] = useState<string[]>(settings.blockedWebsites?.map(s => s.domain) ?? [])
  const [input, setInput] = useState('')

  const add = () => {
    const domain = input.trim().replace(/^https?:\/\//,'').replace(/\/.*$/,'')
    if (domain && !sites.includes(domain)) { setSites(prev => [...prev, domain]); setInput('') }
  }

  const save = () => {
    onSave({ ...settings, blockedWebsites: sites.map((d, i) => ({ id: `site-${i}`, domain: d, enabled: true })) })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Blocked Websites</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">These domains are noted for your awareness. Platform-level blocking requires admin access.</p>
          <div className="flex gap-2 mb-3">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="twitter.com"
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <button onClick={add} className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors">Add</button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {sites.map(s => (
              <div key={s} className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                <span className="text-red-500 text-sm">🚫</span>
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{s}</span>
                <button onClick={() => setSites(prev => prev.filter(d => d !== s))} className="text-gray-400 hover:text-red-500 transition-colors text-sm">✕</button>
              </div>
            ))}
            {sites.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No websites blocked yet</p>}
          </div>
          <button onClick={save} className="w-full mt-4 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-600 transition-colors">Save</button>
        </div>
      </div>
    </div>
  )
}

function KeywordModal({ settings, onSave, onClose }: { settings: AppSettings; onSave: (s: AppSettings) => void; onClose: () => void }) {
  const [words, setWords] = useState<string[]>(settings.blockedWords ?? [])
  const [input, setInput] = useState('')
  const add = () => { const w = input.trim().toLowerCase(); if (w && !words.includes(w)) { setWords(prev => [...prev, w]); setInput('') } }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Keyword Blocker</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">These words are tracked as distraction keywords for your focus reports.</p>
          <div className="flex gap-2 mb-3">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="breaking news, viral…"
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <button onClick={add} className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600">Add</button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {words.map(w => (
              <span key={w} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {w} <button onClick={() => setWords(prev => prev.filter(x => x !== w))} className="hover:text-red-500 transition-colors">✕</button>
              </span>
            ))}
          </div>
          <button onClick={() => { onSave({ ...settings, blockedWords: words }); onClose() }} className="w-full mt-4 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-600 transition-colors">Save</button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state, updateSettings, deleteTask, refreshTasks } = useApp()
  const { settings } = state
  const [showSites, setShowSites] = useState(false)
  const [showKeywords, setShowKeywords] = useState(false)

  const update = (partial: Partial<AppSettings>) => updateSettings({ ...settings, ...partial })

  const handleExport = async () => {
    const data = JSON.stringify({ settings, tasks: state.tasks, version: '1.0', exportedAt: new Date().toISOString() }, null, 2)
    const path = await window.api.app.exportBackup(data)
    alert(`Backup saved to:\n${path}`)
  }

  const handleClearTasks = async () => {
    if (!confirm('Delete ALL tasks? This cannot be undone.')) return
    for (const t of state.tasks) await deleteTask(t.id)
    await refreshTasks()
    alert('All tasks deleted.')
  }

  const DURATIONS = [30, 45, 60, 90, 120]

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Settings</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

        <Section title="Profile">
          <BtnRow icon="👤" label={settings.userProfile?.name ?? 'Set up your profile'} desc={settings.userProfile?.occupation ?? 'Name, occupation, daily goal and more'} onClick={() => navigate('profile')} />
        </Section>

        <Section title="Appearance">
          <Row label="Dark Mode" desc="Switch between light and dark theme">
            <Toggle value={settings.darkMode} onChange={v => update({ darkMode: v })} />
          </Row>
        </Section>

        <Section title="Scheduling">
          <Row label="Default Task Duration" desc="Used when creating new tasks">
            <div className="flex gap-1">
              {DURATIONS.map(d => (
                <button key={d} onClick={() => update({ defaultDuration: d })}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${settings.defaultDuration === d ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                  {d}m
                </button>
              ))}
            </div>
          </Row>
        </Section>

        <Section title="Focus Mode">
          <Row label="Auto-enable Focus Mode" desc="Activate when a focus task starts">
            <Toggle value={settings.focusModeEnabled} onChange={v => update({ focusModeEnabled: v })} />
          </Row>
          <Row label="Keep Focus Until Task End" desc="Focus stays active even after completing a task early">
            <Toggle value={settings.keepFocusActiveUntilTaskEnd} onChange={v => update({ keepFocusActiveUntilTaskEnd: v })} />
          </Row>
        </Section>

        <Section title="Pomodoro">
          <Row label="Enable Pomodoro" desc="Auto-break your focus into timed intervals">
            <Toggle value={settings.pomodoroEnabled} onChange={v => update({ pomodoroEnabled: v })} />
          </Row>
          {settings.pomodoroEnabled && (
            <>
              <Row label="Focus Duration" desc={`${settings.pomodoroDuration} minutes`}>
                <input type="range" min={10} max={60} step={5} value={settings.pomodoroDuration} onChange={e => update({ pomodoroDuration: Number(e.target.value) })}
                  className="w-24 accent-indigo-500" />
              </Row>
              <Row label="Break Duration" desc={`${settings.pomodoroBreak} minutes`}>
                <input type="range" min={2} max={30} step={1} value={settings.pomodoroBreak} onChange={e => update({ pomodoroBreak: Number(e.target.value) })}
                  className="w-24 accent-indigo-500" />
              </Row>
            </>
          )}
        </Section>

        <Section title="Notifications">
          <Row label="Enable Notifications" desc="Task reminders and focus alerts">
            <Toggle value={settings.notificationsEnabled} onChange={v => update({ notificationsEnabled: v })} />
          </Row>
          <Row label="Weekly Report" desc="Sunday summary of your week">
            <Toggle value={settings.weeklyReportEnabled ?? false} onChange={v => update({ weeklyReportEnabled: v })} />
          </Row>
        </Section>

        <Section title="Focus Enforcement (PC)">
          <BtnRow icon="⏱" label="Standalone Block" desc="Start a timed block right now — no task needed" onClick={() => navigate('standalone-block')} />
          <BtnRow icon="🛡" label="Block Enforcement" desc="Websites, keywords, schedules & deterrents" onClick={() => navigate('block-defense')} />
          <BtnRow icon="♾️" label="Always-On Block List" desc={`${settings.alwaysOnPackages?.length ?? 0} domain${(settings.alwaysOnPackages?.length ?? 0) !== 1 ? 's' : ''} blocked 24/7`} onClick={() => navigate('always-on')} />
          <BtnRow icon="🌐" label="Blocked Websites" desc={`${settings.blockedWebsites?.length ?? 0} site${(settings.blockedWebsites?.length ?? 0) !== 1 ? 's' : ''} tracked`} onClick={() => setShowSites(true)} />
          <BtnRow icon="🔤" label="Keyword Blocker" desc={`${settings.blockedWords?.length ?? 0} keyword${(settings.blockedWords?.length ?? 0) !== 1 ? 's' : ''} tracked`} onClick={() => navigate('keyword-blocker')} />
          <BtnRow icon="⏰" label="Block Schedules" desc={`${settings.recurringBlockSchedules?.length ?? 0} recurring schedule${(settings.recurringBlockSchedules?.length ?? 0) !== 1 ? 's' : ''}`} onClick={() => navigate('block-defense')} />
        </Section>

        <Section title="Backup">
          <BtnRow icon="📦" label="Export Backup" desc="Save all tasks & settings to a JSON file" onClick={handleExport} />
          <BtnRow icon="📋" label="View Reports" desc="Detailed focus & productivity report" onClick={() => navigate('reports')} />
        </Section>

        <Section title="Help & Info">
          <BtnRow icon="📖" label="How to Use FocusFlow" desc="Quick guide to all features" onClick={() => navigate('how-to-use')} />
          <BtnRow icon="🆕" label="What's New" desc="Version history and release notes" onClick={() => navigate('changelog')} />
          <BtnRow icon="🔒" label="Privacy & Terms" desc="Local data only — no servers" onClick={() => navigate('privacy')} />
        </Section>

        <Section title="Danger Zone">
          <BtnRow icon="🗑" label="Clear All Tasks" desc="Permanently delete all tasks" danger onClick={handleClearTasks} />
        </Section>

        <div className="text-center py-4">
          <p className="text-xs text-gray-400 dark:text-gray-600">FocusFlow PC v1.1.0</p>
          <p className="text-xs text-gray-300 dark:text-gray-700 mt-0.5">Built with ❤️ for deep work</p>
        </div>
      </div>

      {showSites && <BlockedSitesModal settings={settings} onSave={updateSettings} onClose={() => setShowSites(false)} />}
      {showKeywords && <KeywordModal settings={settings} onSave={updateSettings} onClose={() => setShowKeywords(false)} />}
    </div>
  )
}
