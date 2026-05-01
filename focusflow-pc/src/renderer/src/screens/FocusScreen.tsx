import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatTime, getActiveTask, isAwaitingDecision } from '../services/taskService'
import dayjs from 'dayjs'

type Page = 'today' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active'

function TimerRing({ startTime, endTime, color, isFocusing }: { startTime: string; endTime: string; color: string; isFocusing: boolean }) {
  const [elapsed, setElapsed] = useState(0)
  const [now, setNow] = useState(Date.now())
  const size = 220
  const stroke = 12
  const radius = (size - stroke * 2) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const total = end - start
  const elapsedMs = Math.max(0, now - start)
  const progress = Math.min(1, elapsedMs / total)
  const remaining = Math.max(0, end - now)
  const remMins = Math.floor(remaining / 60000)
  const remSecs = Math.floor((remaining % 60000) / 1000)

  const dashOffset = circumference * (1 - progress)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Ripple rings when focusing */}
      {isFocusing && [0.85, 0.92, 1].map((scale, i) => (
        <div key={i} className="absolute rounded-full border-2 animate-ripple pointer-events-none" style={{ width: size * scale, height: size * scale, borderColor: color + '40', animationDelay: `${i * 0.5}s`, animationDuration: '2s' }} />
      ))}
      <svg width={size} height={size} className={isFocusing ? 'animate-spin-slow' : ''} style={{ position: 'absolute' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color + '22'} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <div className="relative flex flex-col items-center justify-center rounded-full shadow-2xl" style={{ width: size * 0.7, height: size * 0.7, backgroundColor: color }}>
        <span className="text-3xl font-black text-white tabular-nums">
          {String(remMins).padStart(2,'0')}:{String(remSecs).padStart(2,'0')}
        </span>
        <span className="text-xs font-semibold text-white/70 mt-1">{progress >= 1 ? "TIME'S UP" : `${Math.round(progress * 100)}% done`}</span>
      </div>
    </div>
  )
}

export default function FocusScreen({ navigate }: { navigate: (p: Page) => void }) {
  const { state, todayTasks, activeTask, currentTask, activeTasks, startFocusMode, stopFocusMode, completeTask, skipTask } = useApp()
  const task = currentTask ?? activeTask ?? activeTasks[0] ?? null
  const isFocusing = state.focusSession?.isActive === true && state.focusSession?.taskId === task?.id
  const awaiting = task ? isAwaitingDecision(task) : false
  const otherActiveCount = activeTasks.filter(t => t.id !== task?.id).length
  const [showExtend, setShowExtend] = useState(false)
  const { extendTaskTime } = useApp()

  // No task at all
  if (!task) {
    const upcoming = todayTasks.filter(t => t.status === 'scheduled' && new Date(t.startTime) > new Date()).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]
    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-5 text-4xl">🛡</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">No active task</h2>
        {upcoming ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Next up: <span className="font-semibold text-indigo-500">{upcoming.title}</span> at {formatTime(upcoming.startTime)}</p>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Schedule tasks on the Today tab to get started.</p>
        )}
        <button onClick={() => navigate('today')} className="mt-5 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-sm transition-colors">Go to Today →</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      {/* Status bar */}
      <div className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className={`w-2 h-2 rounded-full ${isFocusing ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{isFocusing ? 'Focus Mode Active' : 'Task In Progress'}</span>
        {otherActiveCount > 0 && (
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">+{otherActiveCount} more active</span>
        )}
      </div>

      <div className="flex flex-col items-center px-6 py-8 gap-6 flex-1">
        {/* Ring timer */}
        <TimerRing startTime={task.startTime} endTime={task.endTime} color={task.color} isFocusing={isFocusing} />

        {/* Task info */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">{task.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{formatTime(task.startTime)} – {formatTime(task.endTime)}</p>
          {task.tags.length > 0 && (
            <div className="flex gap-1.5 justify-center mt-2 flex-wrap">
              {task.tags.map(tag => (
                <span key={tag} className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: task.color + '20', color: task.color }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Time's up prompt */}
        {awaiting && (
          <div className="w-full max-w-sm bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-500">⏰</span>
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400">Time's up — what next?</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">This task ran past its scheduled end. Pick one to clear it.</p>
            <div className="flex gap-2">
              <button onClick={() => completeTask(task.id)} className="flex-1 py-2 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors">✓ Done</button>
              <button onClick={() => setShowExtend(true)} className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors">+ Extend</button>
              <button onClick={() => { if (confirm('Skip this task?')) skipTask(task.id) }} className="flex-1 py-2 rounded-xl bg-gray-400 text-white text-sm font-bold hover:bg-gray-500 transition-colors">✕ Skip</button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="w-full max-w-sm space-y-3">
          {!isFocusing ? (
            <button onClick={() => startFocusMode(task.id)} className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]" style={{ backgroundColor: task.color }}>
              🛡 Activate Focus Mode
            </button>
          ) : (
            <button onClick={() => { if (confirm('End focus mode for this task?')) stopFocusMode() }} className="w-full py-3.5 rounded-2xl bg-gray-400 hover:bg-gray-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
              ⏹ Stop Focus Mode
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { if (confirm('Mark task as done?')) completeTask(task.id) }} className="py-2.5 rounded-xl border-2 border-green-500 text-green-600 dark:text-green-400 font-semibold text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
              ✓ Done
            </button>
            <button onClick={() => setShowExtend(true)} className="py-2.5 rounded-xl border-2 border-orange-400 text-orange-600 dark:text-orange-400 font-semibold text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
              + Extend
            </button>
          </div>
          {isFocusing && (
            <button onClick={async () => { if (confirm('Emergency override will stop focus and be logged. Only in genuine emergencies.')) { await window.api.focus.logOverride(task.id, 'emergency'); stopFocusMode() } }}
              className="w-full py-2 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 text-red-500 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
              🚨 Emergency Override
            </button>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">Notes</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{task.description}</p>
          </div>
        )}
      </div>

      {/* Extend modal */}
      {showExtend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowExtend(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-72 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">Extend by how long?</h3>
            <div className="grid grid-cols-3 gap-2">
              {[15,30,45,60,90].map(m => (
                <button key={m} onClick={() => { extendTaskTime(task.id, m); setShowExtend(false) }}
                  className="py-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-400 text-sm font-bold hover:bg-orange-100 transition-colors">
                  +{m}m
                </button>
              ))}
            </div>
            <button onClick={() => setShowExtend(false)} className="w-full mt-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
