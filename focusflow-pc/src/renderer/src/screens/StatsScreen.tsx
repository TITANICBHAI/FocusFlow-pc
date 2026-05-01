import React, { useEffect, useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { getTodayTasks } from '../services/taskService'
import { formatDuration } from '../services/taskService'
import dayjs from 'dayjs'

type Filter = 'today' | 'yesterday' | 'week' | 'alltime'

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-1 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</span>
      </div>
      <span className="text-2xl font-black" style={{ color }}>{value}</span>
    </div>
  )
}

function BarChart({ data, maxVal, color }: { data: { label: string; value: number }[]; maxVal: number; color: string }) {
  return (
    <div className="flex items-end gap-1 h-24 mt-3">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[9px] font-bold text-gray-500">{d.value > 0 ? d.value : ''}</span>
          <div className="w-full rounded-t-sm" style={{ backgroundColor: color + '30', height: '100%', position: 'relative' }}>
            <div className="absolute bottom-0 w-full rounded-t-sm transition-all" style={{ backgroundColor: color, height: maxVal > 0 ? `${(d.value / maxVal) * 100}%` : '0%' }} />
          </div>
          <span className="text-[9px] text-gray-400 dark:text-gray-500">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function Heatmap({ completions }: { completions: { date: string; completed: number; total: number }[] }) {
  const weeks: { date: string; rate: number }[][] = []
  const byDate = new Map(completions.map(c => [c.date, c.completed / Math.max(c.total, 1)]))
  const start = dayjs().subtract(11, 'week').startOf('week')
  let week: { date: string; rate: number }[] = []
  for (let d = start; d.isBefore(dayjs().add(1, 'day')); d = d.add(1, 'day')) {
    const dateStr = d.format('YYYY-MM-DD')
    week.push({ date: dateStr, rate: byDate.get(dateStr) ?? -1 })
    if (d.day() === 6) { weeks.push(week); week = [] }
  }
  if (week.length) weeks.push(week)

  const getColor = (rate: number) => {
    if (rate < 0) return '#f3f4f6'
    if (rate === 0) return '#e0e7ff'
    if (rate < 0.5) return '#a5b4fc'
    if (rate < 0.8) return '#6366f1'
    return '#4338ca'
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">12-Week Activity</p>
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day, di) => (
              <div key={di} title={`${day.date}: ${day.rate >= 0 ? Math.round(day.rate * 100) + '% done' : 'No data'}`}
                className="w-3 h-3 rounded-sm cursor-pointer hover:opacity-80 transition-opacity dark:opacity-80"
                style={{ backgroundColor: day.rate < 0 ? (document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6') : getColor(day.rate) }} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-1 justify-end">
        {['No data', 'Low', 'Medium', 'High', 'Full'].map((l, i) => (
          <div key={l} className="flex items-center gap-0.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: ['#f3f4f6','#e0e7ff','#a5b4fc','#6366f1','#4338ca'][i] }} />
            {i === 4 && <span className="text-[8px] text-gray-400">{l}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function Milestones({ allTimeMins, allTimeSessions, streak }: { allTimeMins: number; allTimeSessions: number; streak: number }) {
  const badges = [
    { icon: '⏱', label: '1 Hour', sub: 'focus time', earned: allTimeMins >= 60, color: '#6366f1' },
    { icon: '🕐', label: '10 Hours', sub: 'focus time', earned: allTimeMins >= 600, color: '#6366f1' },
    { icon: '🏅', label: '10 Sessions', sub: 'completed', earned: allTimeSessions >= 10, color: '#10b981' },
    { icon: '🥇', label: '100 Sessions', sub: 'completed', earned: allTimeSessions >= 100, color: '#10b981' },
    { icon: '🔥', label: '7-Day Streak', sub: 'in a row', earned: streak >= 7, color: '#f59e0b' },
    { icon: '💪', label: '30-Day Streak', sub: 'in a row', earned: streak >= 30, color: '#f59e0b' },
  ]
  return (
    <div className="grid grid-cols-3 gap-2">
      {badges.map(b => (
        <div key={b.label} className={`flex flex-col items-center py-3 px-2 rounded-xl border text-center transition-all ${b.earned ? 'border-transparent shadow-sm' : 'border-gray-200 dark:border-gray-700 opacity-40 grayscale'}`}
          style={b.earned ? { backgroundColor: b.color + '15', borderColor: b.color + '30' } : {}}>
          <span className="text-2xl mb-1">{b.icon}</span>
          <span className="text-xs font-bold" style={{ color: b.earned ? b.color : undefined }}>{b.label}</span>
          <span className="text-[10px] text-gray-400">{b.sub}</span>
        </div>
      ))}
    </div>
  )
}

export default function StatsScreen() {
  const { state } = useApp()
  const [filter, setFilter] = useState<Filter>('today')
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [focusMinutes, setFocusMinutes] = useState(0)
  const [allTimeMins, setAllTimeMins] = useState(0)
  const [allTimeSessions, setAllTimeSessions] = useState(0)
  const [completions, setCompletions] = useState<{ date: string; completed: number; total: number }[]>([])
  const [overrideCount, setOverrideCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [s, bs, fm, atm, ats, ov, comps] = await Promise.all([
        window.api.stats.getStreak().catch(() => 0),
        window.api.stats.getBestStreak().catch(() => 0),
        window.api.focus.getTodayMinutes().catch(() => 0),
        window.api.stats.getAllTimeFocusMins().catch(() => 0),
        window.api.stats.getAllTimeSessions().catch(() => 0),
        window.api.stats.getTodayOverrides().catch(() => 0),
        window.api.stats.getRecentDayCompletions(84).catch(() => []),
      ])
      setStreak(s); setBestStreak(bs); setFocusMinutes(fm)
      setAllTimeMins(atm); setAllTimeSessions(ats); setOverrideCount(ov); setCompletions(comps)
      setLoading(false)
    }
    load()
  }, [state.tasks, state.focusSession])

  const todayTasks = getTodayTasks(state.tasks)
  const todayDone = todayTasks.filter(t => t.status === 'completed').length
  const todayTotal = todayTasks.length
  const todayRate = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0

  const weekDays = useMemo(() => {
    const days: { label: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day')
      const dateStr = d.format('YYYY-MM-DD')
      const comp = completions.find(c => c.date === dateStr)
      days.push({ label: d.format('dd'), value: comp?.completed ?? 0 })
    }
    return days
  }, [completions])

  const maxWeek = Math.max(...weekDays.map(d => d.value), 1)

  const rateColor = todayRate >= 80 ? '#10b981' : todayRate >= 50 ? '#f59e0b' : '#ef4444'

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Stats</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Your focus & productivity overview</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {(['today','yesterday','week','alltime'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${filter === f ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
            {f === 'alltime' ? 'All Time' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {filter === 'today' && (
          <>
            {streak > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-3xl">🔥</span>
                <div>
                  <p className="font-bold text-orange-600 dark:text-orange-400">{streak}-day streak!</p>
                  <p className="text-xs text-orange-500/70">Keep completing tasks daily</p>
                </div>
              </div>
            )}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">Focus Time Today</p>
              {focusMinutes > 0 ? (
                <p className="text-5xl font-black text-indigo-500">{Math.floor(focusMinutes/60) > 0 ? `${Math.floor(focusMinutes/60)}h ` : ''}<span className="text-3xl">{focusMinutes%60}m</span></p>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">No focus sessions yet today</p>
              )}
              {overrideCount > 0 && <p className="text-xs text-orange-500 mt-1">⚠️ {overrideCount} override{overrideCount !== 1 ? 's' : ''}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Tasks Done" value={`${todayDone}/${todayTotal}`} icon="✅" color={rateColor} />
              <StatCard label="Completion" value={`${todayRate}%`} icon="📈" color={rateColor} />
            </div>
            {todayTotal > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Task Breakdown</p>
                {[
                  { label: 'Completed', value: todayTasks.filter(t => t.status === 'completed').length, color: '#10b981' },
                  { label: 'Remaining', value: todayTasks.filter(t => t.status === 'scheduled').length, color: '#3b82f6' },
                  { label: 'Skipped', value: todayTasks.filter(t => t.status === 'skipped').length, color: '#9ca3af' },
                  { label: 'Overdue', value: todayTasks.filter(t => t.status === 'overdue').length, color: '#ef4444' },
                ].filter(r => r.value > 0).map(r => (
                  <div key={r.label} className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-20">{r.label}</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ backgroundColor: r.color, width: `${(r.value / todayTotal) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold w-4" style={{ color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {filter === 'yesterday' && (
          (() => {
            const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
            const comp = completions.find(c => c.date === yesterday)
            const rate = comp && comp.total > 0 ? Math.round((comp.completed / comp.total) * 100) : 0
            return (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Yesterday</p>
                  <p className="text-4xl font-black" style={{ color: rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444' }}>{rate}%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{comp?.completed ?? 0}/{comp?.total ?? 0} tasks</p>
                </div>
                {!comp ? (
                  <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">No tasks recorded yesterday</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Done" value={comp.completed} icon="✅" color="#10b981" />
                    <StatCard label="Total" value={comp.total} icon="📋" color="#6366f1" />
                  </div>
                )}
              </>
            )
          })()
        )}

        {filter === 'week' && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Tasks Completed — Last 7 Days</p>
              <BarChart data={weekDays} maxVal={maxWeek} color="#6366f1" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <Heatmap completions={completions} />
            </div>
          </>
        )}

        {filter === 'alltime' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Focus Hours" value={`${Math.floor(allTimeMins/60)}h`} icon="⏱" color="#6366f1" />
              <StatCard label="Sessions" value={allTimeSessions} icon="🎯" color="#10b981" />
              <StatCard label="Best Streak" value={`${bestStreak}d`} icon="🔥" color="#f59e0b" />
              <StatCard label="Current Streak" value={`${streak}d`} icon="⚡" color="#f59e0b" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Milestones</p>
              <Milestones allTimeMins={allTimeMins} allTimeSessions={allTimeSessions} streak={streak} />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <Heatmap completions={completions} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
