import React, { useEffect, useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { getTodayTasks } from '../services/taskService'
import { formatDuration } from '../services/taskService'
import dayjs from 'dayjs'

type Range = 'yesterday' | 'today' | 'week' | 'alltime'

export default function ReportsScreen({ onBack }: { onBack: () => void }) {
  const { state } = useApp()
  const [range, setRange] = useState<Range>('today')
  const [loading, setLoading] = useState(true)
  const [focusMinsToday, setFocusMinsToday] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [allTimeFocus, setAllTimeFocus] = useState(0)
  const [allTimeSessions, setAllTimeSessions] = useState(0)
  const [todayOverrides, setTodayOverrides] = useState(0)
  const [dayCompletions, setDayCompletions] = useState<{ date: string; completed: number; total: number }[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [fm, s, bs, atm, ats, ov, days] = await Promise.all([
        window.api.focus.getTodayMinutes().catch(() => 0),
        window.api.stats.getStreak().catch(() => 0),
        window.api.stats.getBestStreak().catch(() => 0),
        window.api.stats.getAllTimeFocusMins().catch(() => 0),
        window.api.stats.getAllTimeSessions().catch(() => 0),
        window.api.stats.getTodayOverrides().catch(() => 0),
        window.api.stats.getRecentDayCompletions(14).catch(() => []),
      ])
      setFocusMinsToday(fm); setStreak(s); setBestStreak(bs)
      setAllTimeFocus(atm); setAllTimeSessions(ats); setTodayOverrides(ov); setDayCompletions(days)
      setLoading(false)
    }
    load()
  }, [])

  const tasks = state.tasks

  const breakdown = useMemo(() => {
    let source: typeof tasks = []
    if (range === 'today') {
      const today = dayjs().startOf('day'); const tomorrow = today.add(1, 'day')
      source = tasks.filter(t => dayjs(t.startTime).isSameOrAfter(today) && dayjs(t.startTime).isBefore(tomorrow))
    } else if (range === 'yesterday') {
      const yesterday = dayjs().subtract(1,'day').startOf('day'); const today = dayjs().startOf('day')
      source = tasks.filter(t => dayjs(t.startTime).isSameOrAfter(yesterday) && dayjs(t.startTime).isBefore(today))
    } else if (range === 'week') {
      const weekAgo = dayjs().subtract(7,'day').startOf('day')
      source = tasks.filter(t => dayjs(t.startTime).isSameOrAfter(weekAgo))
    } else {
      source = tasks
    }
    const total = source.length
    const completed = source.filter(t => t.status === 'completed').length
    const skipped = source.filter(t => t.status === 'skipped').length
    const remaining = source.filter(t => t.status === 'scheduled').length
    const actualMins = source.reduce((sum, t) => sum + t.durationMinutes, 0)
    return { total, completed, skipped, remaining, actualMins }
  }, [tasks, range])

  const weeklySummary = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day')
      const dateStr = d.format('YYYY-MM-DD')
      const comp = dayCompletions.find(c => c.date === dateStr)
      days.push({ day: d.format('ddd'), date: dateStr, completed: comp?.completed ?? 0, total: comp?.total ?? 0 })
    }
    return days
  }, [dayCompletions])

  const focusFeedback = useMemo(() => {
    const h = Math.floor(focusMinsToday / 60)
    if (focusMinsToday === 0) return { icon: '😴', message: "No focus time logged today. Start a task to begin." }
    if (h >= 4) return { icon: '🚀', message: `Incredible — ${h}h of focused work today! You're in a deep-work zone.` }
    if (h >= 2) return { icon: '💪', message: `Great work! ${h}h ${focusMinsToday % 60}m of focus. Keep pushing.` }
    return { icon: '🌱', message: `${focusMinsToday}m of focus so far. Every minute counts!` }
  }, [focusMinsToday])

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">‹</button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Reports</h1>
      </div>

      {/* Range tabs */}
      <div className="flex gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {(['today','yesterday','week','alltime'] as Range[]).map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${range === r ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
            {r === 'alltime' ? 'All Time' : r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Focus time hero */}
        <div className="bg-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{focusFeedback.icon}</span>
            <div>
              <p className="text-xs font-bold opacity-70 uppercase tracking-wider mb-0.5">Focus Time Today</p>
              <p className="text-2xl font-black">
                {focusMinsToday >= 60 ? `${Math.floor(focusMinsToday/60)}h ${focusMinsToday%60}m` : `${focusMinsToday}m`}
              </p>
              <p className="text-xs opacity-80 mt-1">{focusFeedback.message}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/20">
            <div className="text-center"><p className="text-lg font-black">{streak}</p><p className="text-[10px] opacity-70">Streak</p></div>
            <div className="text-center"><p className="text-lg font-black">{bestStreak}</p><p className="text-[10px] opacity-70">Best</p></div>
            <div className="text-center"><p className="text-lg font-black">{allTimeSessions}</p><p className="text-[10px] opacity-70">Sessions</p></div>
          </div>
        </div>

        {/* Overrides */}
        {todayOverrides > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{todayOverrides} focus override{todayOverrides !== 1 ? 's' : ''} today</p>
              <p className="text-xs text-orange-500/70">Each override breaks your flow. Aim for zero.</p>
            </div>
          </div>
        )}

        {/* Task breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Task Breakdown ({range})</p>
          {breakdown.total === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No tasks in this range</p>
          ) : (
            <div className="space-y-2">
              {[
                { label: 'Completed', value: breakdown.completed, icon: '✅', color: '#10b981' },
                { label: 'Remaining', value: breakdown.remaining, icon: '⏳', color: '#3b82f6' },
                { label: 'Skipped', value: breakdown.skipped, icon: '⏭', color: '#9ca3af' },
              ].filter(r => r.value > 0).map(r => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="text-sm w-5">{r.icon}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20">{r.label}</span>
                  <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ backgroundColor: r.color, width: `${(r.value / breakdown.total) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold w-4 text-right" style={{ color: r.color }}>{r.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Total time scheduled:</span>
                <span className="font-bold">{formatDuration(breakdown.actualMins)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Completion rate:</span>
                <span className="font-black text-indigo-500">{breakdown.total > 0 ? Math.round((breakdown.completed / breakdown.total) * 100) : 0}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Weekly summary */}
        {(range === 'week' || range === 'alltime') && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Last 7 Days</p>
            <div className="flex items-end gap-1 h-20">
              {weeklySummary.map(d => {
                const rate = d.total > 0 ? d.completed / d.total : 0
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-sm flex-1 flex items-end justify-center" style={{ backgroundColor: '#e0e7ff' }}>
                      <div className="w-full rounded-t-sm" style={{ backgroundColor: '#6366f1', height: `${rate * 100}%`, minHeight: d.completed > 0 ? 4 : 0 }} />
                    </div>
                    <span className="text-[9px] text-gray-400">{d.day}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* All-time stats */}
        {range === 'alltime' && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Focus Hours', value: `${Math.floor(allTimeFocus/60)}h ${allTimeFocus%60}m`, icon: '⏱', color: '#6366f1' },
              { label: 'Sessions', value: allTimeSessions, icon: '🎯', color: '#10b981' },
              { label: 'Best Streak', value: `${bestStreak}d`, icon: '🔥', color: '#f59e0b' },
              { label: 'Longest Task', value: tasks.length > 0 ? formatDuration(Math.max(...tasks.map(t => t.durationMinutes))) : '—', icon: '⏳', color: '#8b5cf6' },
            ].map(stat => (
              <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{stat.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{stat.label}</span>
                </div>
                <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
