import React, { useState, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { formatTime, isAwaitingDecision } from '../services/taskService'
import { TASK_COLORS } from '../styles/theme'
import type { Task } from '../data/types'
import dayjs from 'dayjs'

type Page = 'today' | 'focus' | 'stats' | 'settings' | 'profile' | 'reports' | 'active'

interface Props { navigate: (p: Page) => void }

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#10b981'
}
const STATUS_ICON: Record<string, string> = {
  scheduled: '⏳', active: '▶️', completed: '✅', skipped: '⏭', overdue: '⚠️'
}

function TaskCard({ task, onComplete, onSkip, onExtend, onStartFocus, onEdit }: {
  task: Task
  onComplete: (id: string) => void
  onSkip: (id: string) => void
  onExtend: (id: string) => void
  onStartFocus: (id: string) => void
  onEdit: (task: Task) => void
}) {
  const isActive = task.status !== 'completed' && task.status !== 'skipped' &&
    new Date(task.startTime) <= new Date() && new Date(task.endTime) >= new Date()
  const awaiting = isAwaitingDecision(task)

  return (
    <div className={`group relative bg-white dark:bg-gray-800 rounded-2xl border transition-all hover:shadow-md animate-fade-in ${
      isActive ? 'border-indigo-400 shadow-md shadow-indigo-100 dark:shadow-indigo-900/30' :
      awaiting ? 'border-orange-400 shadow-md shadow-orange-100 dark:shadow-orange-900/30' :
      'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start gap-3 p-4">
        {/* Color strip */}
        <div className="w-1 self-stretch rounded-full mt-0.5" style={{ backgroundColor: task.color }} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{STATUS_ICON[task.status] ?? '📌'}</span>
            <span className={`text-sm font-bold truncate ${task.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
              {task.title}
            </span>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: PRIORITY_COLOR[task.priority] + '20', color: PRIORITY_COLOR[task.priority] }}>
              {task.priority}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>🕐 {formatTime(task.startTime)} – {formatTime(task.endTime)}</span>
            <span>{task.durationMinutes}m</span>
            {task.tags.length > 0 && task.tags.slice(0,2).map(t => (
              <span key={t} className="px-1.5 py-0.5 rounded-md text-indigo-600 dark:text-indigo-400" style={{ backgroundColor: task.color + '18' }}>#{t}</span>
            ))}
          </div>
          {task.description && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 truncate">{task.description}</p>
          )}
          {awaiting && (
            <div className="mt-2 text-xs font-semibold text-orange-500">⏰ Time's up — pick an action below</div>
          )}
        </div>

        {/* Edit button */}
        <button onClick={() => onEdit(task)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
          ✏️
        </button>
      </div>

      {/* Action row */}
      {task.status !== 'completed' && task.status !== 'skipped' && (
        <div className="flex gap-1 px-4 pb-3">
          <button onClick={() => onComplete(task.id)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">✓ Done</button>
          <button onClick={() => onExtend(task.id)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors">+ Extend</button>
          <button onClick={() => onSkip(task.id)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">↷ Skip</button>
          {(isActive || awaiting) && task.focusMode && (
            <button onClick={() => onStartFocus(task.id)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors">🛡 Focus</button>
          )}
        </div>
      )}
    </div>
  )
}

function AddTaskModal({ onClose, onSave, settings }: { onClose: () => void; onSave: (data: Record<string, unknown>) => void; settings: import('../data/types').AppSettings }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState(() => dayjs().add(5, 'minute').format('YYYY-MM-DDTHH:mm'))
  const [duration, setDuration] = useState(settings.defaultDuration || 60)
  const [priority, setPriority] = useState<string>('medium')
  const [color, setColor] = useState(TASK_COLORS[0])
  const [tags, setTags] = useState('')
  const [focusMode, setFocusMode] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title: title.trim(), description: description.trim() || undefined, startTime: new Date(startTime).toISOString(), durationMinutes: duration, priority, color, tags: tags.split(',').map(t => t.trim()).filter(Boolean), focusMode })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Add Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you working on?" required
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional notes…"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Start Time</label>
              <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Duration (min)</label>
              <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={5} max={480}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Color</label>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {TASK_COLORS.slice(0,8).map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-1 ring-indigo-400 scale-110' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Tags (comma-separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="work, deep-focus, study"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`relative w-10 h-5 rounded-full transition-colors ${focusMode ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`} onClick={() => setFocusMode(v => !v)}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${focusMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Focus Mode for this task</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold transition-colors">Add Task</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditTaskModal({ task, onClose, onSave, onDelete }: { task: Task; onClose: () => void; onSave: (t: Task) => void; onDelete: (id: string) => void }) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [startTime, setStartTime] = useState(dayjs(task.startTime).format('YYYY-MM-DDTHH:mm'))
  const [duration, setDuration] = useState(task.durationMinutes)
  const [priority, setPriority] = useState(task.priority)
  const [color, setColor] = useState(task.color)
  const [tags, setTags] = useState(task.tags.join(', '))
  const [focusMode, setFocusMode] = useState(task.focusMode)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const start = new Date(startTime)
    const end = new Date(start.getTime() + duration * 60000)
    onSave({ ...task, title: title.trim(), description: description.trim() || undefined, startTime: start.toISOString(), endTime: end.toISOString(), durationMinutes: duration, priority: priority as Task['priority'], color, tags: tags.split(',').map(t => t.trim()).filter(Boolean), focusMode, updatedAt: new Date().toISOString() })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Edit Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Start Time</label>
              <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Duration (min)</label>
              <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={5} max={480} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Task['priority'])} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Color</label>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {TASK_COLORS.slice(0,8).map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)} className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-1 ring-indigo-400 scale-110' : ''}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Tags (comma-separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`relative w-10 h-5 rounded-full transition-colors ${focusMode ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`} onClick={() => setFocusMode(v => !v)}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${focusMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Focus Mode</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { if (confirm('Delete this task?')) { onDelete(task.id); onClose() } }} className="px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Delete</button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold transition-colors">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ExtendModal({ taskId, onClose, onExtend }: { taskId: string; onClose: () => void; onExtend: (id: string, mins: number) => void }) {
  const options = [15, 30, 45, 60, 90]
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-72 animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">Extend by how long?</h3>
        <div className="grid grid-cols-3 gap-2">
          {options.map(m => (
            <button key={m} onClick={() => { onExtend(taskId, m); onClose() }}
              className="py-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-sm font-bold hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors">
              +{m}m
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
      </div>
    </div>
  )
}

export default function TodayScreen({ navigate }: Props) {
  const { state, todayTasks, activeTask, completeTask, skipTask, extendTaskTime, addTask, updateTask, deleteTask, startFocusMode } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [extendId, setExtendId] = useState<string | null>(null)

  const completed = todayTasks.filter(t => t.status === 'completed').length
  const skipped  = todayTasks.filter(t => t.status === 'skipped').length
  const bannerTask = activeTask ?? (todayTasks.find(t => isAwaitingDecision(t)) ?? null)
  const awaiting = bannerTask ? isAwaitingDecision(bannerTask) : false

  const handleComplete = useCallback((id: string) => { if (confirm('Mark task as done?')) completeTask(id) }, [completeTask])
  const handleSkip = useCallback((id: string) => { if (confirm('Skip this task?')) skipTask(id) }, [skipTask])

  // 'N' key — quick add task
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT','TEXTAREA','SELECT'].includes(target.tagName) || target.isContentEditable) return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setShowAdd(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{dayjs().format('dddd, MMMM D')}</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-gray-500 dark:text-gray-400">{completed}/{todayTasks.length} done</p>
            {skipped > 0 && <p className="text-sm text-gray-400 dark:text-gray-500">{skipped} skipped</p>}
            {todayTasks.length > 0 && (
              <div className="flex-1 max-w-24 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${todayTasks.length ? (completed / todayTasks.length) * 100 : 0}%` }} />
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          title="Add task (N)"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold transition-colors shadow-sm group"
        >
          <span>+ Add Task</span>
          <kbd className="bg-indigo-400/50 border-indigo-300/50 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">N</kbd>
        </button>
      </div>

      {/* Active/awaiting banner */}
      {bannerTask && (
        <div className={`mx-4 mt-4 rounded-2xl p-4 flex items-center gap-3 shadow-lg ${awaiting ? 'bg-orange-500' : 'bg-indigo-500'}`}>
          <div className={`w-2 h-2 rounded-full bg-white ${awaiting ? '' : 'animate-pulse'}`} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white/70 uppercase tracking-wider">{awaiting ? "TIME'S UP" : 'NOW ACTIVE'}</div>
            <div className="text-sm font-bold text-white truncate">{bannerTask.title}</div>
            <div className="text-xs text-white/70">{awaiting ? `Ended ${formatTime(bannerTask.endTime)} · pick one` : `Until ${formatTime(bannerTask.endTime)}`}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleComplete(bannerTask.id)} className="w-8 h-8 rounded-full bg-white/25 hover:bg-white/40 text-white flex items-center justify-center text-sm transition-colors">✓</button>
            <button onClick={() => setExtendId(bannerTask.id)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center text-sm transition-colors">+</button>
            {awaiting && <button onClick={() => handleSkip(bannerTask.id)} className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center text-sm transition-colors">✕</button>}
            {!awaiting && bannerTask.focusMode && <button onClick={() => startFocusMode(bannerTask.id)} className="w-8 h-8 rounded-full bg-yellow-400/30 hover:bg-yellow-400/50 text-white flex items-center justify-center text-sm transition-colors">🛡</button>}
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {todayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center animate-fade-in">
            <div className="text-6xl mb-4 animate-bounce-in">📅</div>
            <p className="text-base font-bold text-gray-600 dark:text-gray-300">No tasks today</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4">Plan your day to stay focused</p>
            <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors shadow-sm">
              + Schedule Your First Task
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              Press <kbd>N</kbd> anywhere to quickly add a task
            </p>
          </div>
        ) : (
          todayTasks.map(task => (
            <TaskCard key={task.id} task={task}
              onComplete={handleComplete} onSkip={handleSkip}
              onExtend={id => setExtendId(id)} onStartFocus={startFocusMode}
              onEdit={setEditTask} />
          ))
        )}
      </div>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onSave={data => addTask(data as Parameters<typeof addTask>[0])} settings={state.settings} />}
      {editTask && <EditTaskModal task={editTask} onClose={() => setEditTask(null)} onSave={updateTask} onDelete={deleteTask} />}
      {extendId && <ExtendModal taskId={extendId} onClose={() => setExtendId(null)} onExtend={(id, mins) => extendTaskTime(id, mins)} />}
    </div>
  )
}
