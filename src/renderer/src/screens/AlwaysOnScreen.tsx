import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import type { AppSettings } from '../data/types'

type Page = 'today' | 'week' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active' | 'notes' | 'block-defense' | 'keyword-blocker' | 'always-on' | 'changelog' | 'how-to-use' | 'privacy'

// Suggested sites to always-block
const SUGGESTED_GROUPS = [
  {
    label: 'Social Media',
    icon: '📱',
    sites: ['twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'tiktok.com', 'snapchat.com', 'reddit.com', 'tumblr.com'],
  },
  {
    label: 'Video',
    icon: '📺',
    sites: ['youtube.com', 'twitch.tv', 'netflix.com', 'disneyplus.com', 'primevideo.amazon.com'],
  },
  {
    label: 'News / Outrage',
    icon: '📰',
    sites: ['buzzfeed.com', 'dailymail.co.uk', 'tmz.com', 'gawker.com'],
  },
  {
    label: 'Shopping',
    icon: '🛒',
    sites: ['amazon.com', 'ebay.com', 'etsy.com', 'alibaba.com'],
  },
]

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'} cursor-pointer`}
    >
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function AlwaysOnScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state, updateSettings } = useApp()
  const { settings } = state

  const alwaysOnDomains: string[] = settings.alwaysOnPackages ?? []
  const [search, setSearch] = useState('')
  const [domainInput, setDomainInput] = useState('')

  const update = (partial: Partial<AppSettings>) => updateSettings({ ...settings, ...partial })

  const addDomain = () => {
    const d = domainInput.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
    if (!d) return
    if (alwaysOnDomains.includes(d)) { setDomainInput(''); return }
    update({ alwaysOnPackages: [...alwaysOnDomains, d] })
    setDomainInput('')
  }

  const removeDomain = (d: string) => {
    update({ alwaysOnPackages: alwaysOnDomains.filter(x => x !== d) })
  }

  const addGroup = (sites: string[]) => {
    const existing = new Set(alwaysOnDomains)
    const additions = sites.filter(s => !existing.has(s))
    if (additions.length === 0) return
    update({ alwaysOnPackages: [...alwaysOnDomains, ...additions] })
  }

  const clearAll = () => {
    if (alwaysOnDomains.length === 0) return
    if (confirm(`Remove all ${alwaysOnDomains.length} domains from the always-on block list?`)) {
      update({ alwaysOnPackages: [] })
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? alwaysOnDomains.filter(d => d.includes(q)) : alwaysOnDomains
  }, [alwaysOnDomains, search])

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('block-defense')}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Always-On Block List</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {alwaysOnDomains.length > 0
              ? `${alwaysOnDomains.length} domain${alwaysOnDomains.length !== 1 ? 's' : ''} blocked 24/7 — no timer needed`
              : 'Add websites to block them permanently — no session required'}
          </p>
        </div>
        {alwaysOnDomains.length > 0 && (
          <button onClick={clearAll} className="text-sm text-red-500 hover:text-red-700 font-semibold">Clear all</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {/* Enable toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
          <div className="text-2xl">♾️</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Always-On Enforcement</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {settings.alwaysOnEnforcementEnabled
                ? 'On — domains below are blocked continuously, no focus session needed'
                : 'Off — list is saved but not enforced'}
            </p>
          </div>
          <Toggle
            value={settings.alwaysOnEnforcementEnabled ?? false}
            onChange={v => update({ alwaysOnEnforcementEnabled: v })}
          />
        </div>

        {/* Info banner */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-3 flex gap-3 items-start">
          <span className="text-lg mt-0.5">♾️</span>
          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            Domains in this list are blocked <strong>24/7</strong> — no focus session or timer needed. They stay blocked until you remove them here. Unlike the focus-session block list, this list is always active when enforcement is on.
          </p>
        </div>

        {/* Add domain */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Add a Domain</p>
          <div className="flex gap-2">
            <input
              value={domainInput}
              onChange={e => setDomainInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDomain()}
              placeholder="twitter.com, reddit.com…"
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={addDomain}
              className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors"
            >
              Block Forever
            </button>
          </div>
        </div>

        {/* Current list */}
        {alwaysOnDomains.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search blocked domains…"
                  className="flex-1 text-sm text-gray-700 dark:text-gray-200 bg-transparent focus:outline-none"
                />
                {search && <button onClick={() => setSearch('')} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>}
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(d => (
                <div key={d} className="flex items-center gap-3 px-4 py-2.5 group">
                  <span className="text-red-500 text-sm flex-shrink-0">🚫</span>
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 font-medium">{d}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400">ALWAYS</span>
                  <button
                    onClick={() => removeDomain(d)}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {filtered.length === 0 && search && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No domains match "{search}"</p>
              )}
            </div>
          </div>
        )}

        {alwaysOnDomains.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
            <p className="text-2xl mb-2">🚫</p>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">No always-blocked domains yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add a domain above or use the quick presets below</p>
          </div>
        )}

        {/* Quick presets */}
        <div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Quick Presets</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Add a whole category of distracting sites in one tap.</p>
          <div className="space-y-2">
            {SUGGESTED_GROUPS.map(group => {
              const existing = new Set(alwaysOnDomains)
              const newCount = group.sites.filter(s => !existing.has(s)).length
              const allAdded = newCount === 0
              return (
                <button
                  key={group.label}
                  onClick={() => addGroup(group.sites)}
                  disabled={allAdded}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                    allAdded
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 cursor-default'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-red-200 dark:hover:border-red-700 hover:shadow-sm'
                  }`}
                >
                  <span className="text-2xl">{group.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{group.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {group.sites.slice(0, 4).join(', ')}{group.sites.length > 4 ? ` +${group.sites.length - 4}` : ''}
                    </p>
                    <p className={`text-xs font-bold mt-0.5 ${allAdded ? 'text-green-500' : 'text-red-500'}`}>
                      {allAdded ? '✓ All added' : `+${newCount} domain${newCount !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  {!allAdded && <span className="text-red-400 text-lg flex-shrink-0">+</span>}
                  {allAdded && <span className="text-green-500 text-base flex-shrink-0">✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Difference from focus block */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Always-On vs Focus Blocking</p>
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-3">
              <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">♾️ Always-On (this screen)</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Blocked 24/7. No session needed. Stays blocked until you remove it.</p>
            </div>
            <div className="flex-1 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 p-3">
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">🛡 Focus Blocking</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Only blocked when "Website blocking" is enabled in Block Defense.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
