import React, { useEffect, useState, useMemo } from 'react'
import dayjs from 'dayjs'

interface FocusHistoryEntry {
  id: number
  taskId: string
  taskTitle: string
  taskColor: string
  taskPriority: string
  startedAt: string
  endedAt: string
  durationMinutes: number
  overrideCount: number
}

type Range = 7 | 30 | 90 | 365

const RANGES: { value: Range; label: string }[] = [
  { value: 7,   label: '7 days' },
  { value: 30,  label: '30 days' },
  { value: 90,  label: '90 days' },
  { value: 365, label: 'All time' },
]

function fmtDur(mins: number): string {
  if (mins < 1)  return '< 1m'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function fmtTime(iso: string): string {
  return dayjs(iso).format('h:mm A')
}

function fmtDateHeader(iso: string): string {
  const d = dayjs(iso)
  const today     = dayjs().startOf('day')
  const yesterday = today.subtract(1, 'day')
  if (d.isSame(today, 'day'))     return 'Today'
  if (d.isSame(yesterday, 'day')) return 'Yesterday'
  if (d.isAfter(today.subtract(7, 'day'))) return d.format('dddd')
  return d.format('MMMM D, YYYY')
}

const PRIORITY_COLOR: Record<string, string> = {
  low:      '#6b7280',
  medium:   '#6366f1',
  high:     '#f59e0b',
  critical: '#ef4444',
}

function SummaryCard({ label, value, icon, sub, color }: {
  label: string; value: string; icon: string; sub?: string; color?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</span>
      </div>
      <span className="text-2xl font-black" style={{ color: color ?? '#6366f1' }}>{value}</span>
      {sub && <span className="text-[10px] text-gray-400 dark:text-gray-500">{sub}</span>}
    </div>
  )
}

function DurationBar({ minutes, maxMinutes }: { minutes: number; maxMinutes: number }) {
  const pct = maxMinutes > 0 ? Math.max(4, Math.round((minutes / maxMinutes) * 100)) : 4
  const color = minutes >= 90 ? '#10b981' : minutes >= 45 ? '#6366f1' : minutes >= 20 ? '#f59e0b' : '#94a3b8'
  return (
    <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function SessionCard({ entry, maxMinutes }: { entry: FocusHistoryEntry; maxMinutes: number }) {
  const durColor = entry.durationMinutes >= 90 ? '#10b981'
    : entry.durationMinutes >= 45 ? '#6366f1'
    : entry.durationMinutes >= 20 ? '#f59e0b'
    : '#94a3b8'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 hover:shadow-md dark:hover:shadow-gray-900/30 transition-shadow">
      <div className="flex items-start gap-3">
        {/* Color dot */}
        <div className="mt-0.5 flex-shrink-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-800" style={{ backgroundColor: entry.taskColor }} />

        <div className="flex-1 min-w-0">
          {/* Task title */}
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{entry.taskTitle}</p>
            <span
              className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: PRIORITY_COLOR[entry.taskPriority] + '20', color: PRIORITY_COLOR[entry.taskPriority] }}
            >{entry.taskPriority}</span>
          </div>

          {/* Time range */}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {fmtTime(entry.startedAt)} → {fmtTime(entry.endedAt)}
          </p>

          {/* Bar */}
          <DurationBar minutes={entry.durationMinutes} maxMinutes={maxMinutes} />
        </div>

        {/* Right side */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-sm font-black" style={{ color: durColor }}>{fmtDur(entry.durationMinutes)}</span>
          {entry.overrideCount > 0 && (
            <span className="text-[9px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 rounded-full">
              {entry.overrideCount} override{entry.overrideCount > 1 ? 's' : ''}
            </span>
          )}
          {entry.overrideCount === 0 && (
            <span className="text-[9px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-1.5 py-0.5 rounded-full">
              Clean ✓
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function FocusHistoryScreen({ onBack }: { onBack: () => void }) {
  const [range, setRange] = useState<Range>(30)
  const [entries, setEntries] = useState<FocusHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    window.api.stats.getFocusHistory(range)
      .then((data: unknown) => { setEntries(data as FocusHistoryEntry[]); setLoading(false) })
      .catch(() => setLoading(false))
  }, [range])

  // Summary stats
  const { totalMins, totalSessions, avgMins, bestMins, cleanSessions, maxSingleMins } = useMemo(() => {
    if (entries.length === 0) return { totalMins: 0, totalSessions: 0, avgMins: 0, bestMins: 0, cleanSessions: 0, maxSingleMins: 0 }
    const totalMins    = entries.reduce((s, e) => s + e.durationMinutes, 0)
    const totalSessions = entries.length
    const avgMins      = Math.round(totalMins / totalSessions)
    const bestMins     = Math.max(...entries.map(e => e.durationMinutes))
    const cleanSessions = entries.filter(e => e.overrideCount === 0).length
    return { totalMins, totalSessions, avgMins, bestMins, cleanSessions, maxSingleMins: bestMins }
  }, [entries])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, FocusHistoryEntry[]>()
    for (const e of entries) {
      const key = dayjs(e.startedAt).format('YYYY-MM-DD')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [entries])

  // Daily focus bars (for the mini heatmap-style chart)
  const dailyTotals = useMemo(() => {
    return grouped.map(([date, items]) => ({
      date,
      total: items.reduce((s, e) => s + e.durationMinutes, 0),
      count: items.length,
    })).reverse()
  }, [grouped])
  const maxDayTotal = useMemo(() => Math.max(...dailyTotals.map(d => d.total), 1), [dailyTotals])

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 transition-colors"
          >←</button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Focus History</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Every deep-work session you've logged</p>
          </div>
          {/* Range filter */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  range === r.value
                    ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >{r.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">⏱</div>
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">No focus sessions yet</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500">Start a focus session from the Focus tab — it will appear here</p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard
                icon="⏱" label="Total Focus"
                value={totalMins >= 60 ? `${(totalMins / 60).toFixed(1)}h` : `${totalMins}m`}
                sub={`${totalSessions} session${totalSessions !== 1 ? 's' : ''}`}
                color="#6366f1"
              />
              <SummaryCard
                icon="📏" label="Avg Session"
                value={fmtDur(avgMins)}
                sub="per session"
                color="#10b981"
              />
              <SummaryCard
                icon="🏆" label="Best Session"
                value={fmtDur(bestMins)}
                sub="single session"
                color="#f59e0b"
              />
              <SummaryCard
                icon="✅" label="Clean Sessions"
                value={`${cleanSessions}/${totalSessions}`}
                sub={`${Math.round((cleanSessions / totalSessions) * 100)}% no overrides`}
                color="#10b981"
              />
            </div>

            {/* Daily activity chart */}
            {dailyTotals.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Daily Focus Time</p>
                <div className="flex items-end gap-1 h-16">
                  {dailyTotals.map(d => {
                    const h = Math.max(4, Math.round((d.total / maxDayTotal) * 64))
                    const color = d.total >= 120 ? '#10b981' : d.total >= 60 ? '#6366f1' : d.total >= 30 ? '#f59e0b' : '#e2e8f0'
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full rounded-t-sm transition-all duration-300"
                          style={{ height: `${h}px`, backgroundColor: color }}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-gray-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {dayjs(d.date).format('MMM D')}: {fmtDur(d.total)}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-gray-400">{dayjs(dailyTotals[0]?.date).format('MMM D')}</span>
                  <span className="text-[9px] text-gray-400">{dayjs(dailyTotals[dailyTotals.length - 1]?.date).format('MMM D')}</span>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-5">
              {grouped.map(([date, items]) => {
                const dayTotal = items.reduce((s, e) => s + e.durationMinutes, 0)
                return (
                  <div key={date}>
                    {/* Date header */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <span className="text-xs font-black text-gray-600 dark:text-gray-400">
                          {fmtDateHeader(date)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                          {dayjs(date).format('MMM D')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400">{items.length} session{items.length !== 1 ? 's' : ''}</span>
                        <span className="text-[10px] font-black text-indigo-500">{fmtDur(dayTotal)} total</span>
                      </div>
                    </div>

                    {/* Sessions */}
                    <div className="space-y-2 pl-1">
                      {items.map(entry => (
                        <SessionCard key={entry.id} entry={entry} maxMinutes={maxSingleMins} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
