import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react'
import type { Task, AppSettings, FocusSession } from '../data/types'
import { createTask, extendTask, getActiveTask, getAllActiveTasks, getCurrentTask, getTodayTasks, updateTaskStatus } from '../services/taskService'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
dayjs.extend(isSameOrAfter)



interface AppState {
  tasks: Task[]
  settings: AppSettings
  focusSession: FocusSession | null
  isDbReady: boolean
  initError: string | null
}

type Action =
  | { type: 'INIT'; tasks: Task[]; settings: AppSettings; focusSession: FocusSession | null }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'SET_FOCUS_SESSION'; payload: FocusSession | null }
  | { type: 'SET_INIT_ERROR'; payload: string }

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false, defaultDuration: 60, defaultReminderOffsets: [-10, -5, 0],
  focusModeEnabled: true, allowedInFocus: [], pomodoroEnabled: false, pomodoroDuration: 25,
  pomodoroBreak: 5, notificationsEnabled: true, onboardingComplete: true, privacyAccepted: true,
  standaloneBlockPackages: [], standaloneBlockUntil: null, blockedWords: [],
  recurringBlockSchedules: [], keepFocusActiveUntilTaskEnd: false,
  blockedWebsites: [], blockedWebsitesEnabled: false, weeklyReportEnabled: false,
  aversionSoundEnabled: false, tipsCardDismissed: false,
  alwaysOnEnforcementEnabled: true, alwaysOnPackages: [],
  autoCopyToAlwaysOn: false, beginnerMode: false, lastShownStreakMilestone: 0,
  userProfile: undefined,
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT':
      return { ...state, tasks: action.tasks, settings: action.settings, focusSession: action.focusSession, isDbReady: true, initError: null }
    case 'SET_TASKS':
      return { ...state, tasks: action.payload }
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload }
    case 'SET_FOCUS_SESSION':
      return { ...state, focusSession: action.payload }
    case 'SET_INIT_ERROR':
      return { ...state, initError: action.payload }
    default: return state
  }
}

interface AppContextValue {
  state: AppState
  todayTasks: Task[]
  activeTask: Task | null
  currentTask: Task | null
  activeTasks: Task[]
  addTask: (data: Parameters<typeof createTask>[0]) => Promise<void>
  updateTask: (task: Task) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<void>
  skipTask: (id: string) => Promise<void>
  extendTaskTime: (id: string, minutes: number) => Promise<void>
  startFocusMode: (taskId: string) => Promise<void>
  stopFocusMode: () => Promise<void>
  updateSettings: (s: AppSettings) => Promise<void>
  refreshTasks: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    tasks: [], settings: DEFAULT_SETTINGS, focusSession: null, isDbReady: false, initError: null
  })
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state })

  useEffect(() => {
    let cancelled = false
    const init = async (attempt = 0) => {
      try {
        const [tasks, settings, focusSession] = await Promise.all([
          window.api.tasks.getAll(),
          window.api.settings.get(),
          window.api.focus.getActive(),
        ])
        if (cancelled) return
        dispatch({ type: 'INIT', tasks, settings: { ...DEFAULT_SETTINGS, ...settings }, focusSession })
        if (settings?.darkMode) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
      } catch (err) {
        if (cancelled) return
        if (attempt < 4) {
          setTimeout(() => init(attempt + 1), 1000 * (attempt + 1))
        } else {
          dispatch({ type: 'SET_INIT_ERROR', payload: String(err) })
        }
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  // Persist dark mode class whenever setting changes
  useEffect(() => {
    if (state.settings.darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [state.settings.darkMode])

  // Refresh tasks & record daily completion every 60s
  useEffect(() => {
    if (!state.isDbReady) return
    const tick = setInterval(async () => {
      try {
        const tasks = await window.api.tasks.getAll()
        dispatch({ type: 'SET_TASKS', payload: tasks })
        const today = getTodayTasks(tasks)
        const done = today.filter(t => t.status === 'completed').length
        if (today.length > 0) await window.api.stats.recordDayCompletion(done, today.length)
      } catch {
        // silent — next tick will retry
      }
    }, 60000)
    return () => clearInterval(tick)
  }, [state.isDbReady])

  const refreshTasks = useCallback(async () => {
    try {
      const tasks = await window.api.tasks.getAll()
      dispatch({ type: 'SET_TASKS', payload: tasks })
    } catch { /* silent */ }
  }, [])

  const addTask = useCallback(async (data: Parameters<typeof createTask>[0]) => {
    try {
      const task = createTask(data)
      await window.api.tasks.insert(task)
      const tasks = await window.api.tasks.getAll()
      dispatch({ type: 'SET_TASKS', payload: tasks })
      if (stateRef.current.settings.notificationsEnabled && task.startTime) {
        const msUntil = new Date(task.startTime).getTime() - Date.now() - 5 * 60 * 1000
        if (msUntil > 0) {
          setTimeout(() => {
            window.api.app.showNotification('Task Starting Soon', `"${task.title}" starts in 5 minutes`)
          }, msUntil)
        }
      }
    } catch (e) { console.error('addTask failed:', e) }
  }, [])

  const updateTask = useCallback(async (task: Task) => {
    try {
      const updated = { ...task, updatedAt: new Date().toISOString() }
      await window.api.tasks.update(updated)
      const tasks = await window.api.tasks.getAll()
      dispatch({ type: 'SET_TASKS', payload: tasks })
    } catch (e) { console.error('updateTask failed:', e) }
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    try {
      await window.api.tasks.delete(id)
      const tasks = await window.api.tasks.getAll()
      dispatch({ type: 'SET_TASKS', payload: tasks })
    } catch (e) { console.error('deleteTask failed:', e) }
  }, [])

  const completeTask = useCallback(async (id: string) => {
    try {
      const task = stateRef.current.tasks.find(t => t.id === id)
      if (!task) return
      const updated = updateTaskStatus(task, 'completed')
      await window.api.tasks.update(updated)
      if (stateRef.current.focusSession?.taskId === id && !stateRef.current.settings.keepFocusActiveUntilTaskEnd) {
        await window.api.focus.end(id)
        dispatch({ type: 'SET_FOCUS_SESSION', payload: null })
      }
      const tasks = await window.api.tasks.getAll()
      dispatch({ type: 'SET_TASKS', payload: tasks })
      const todayTasks = getTodayTasks(tasks)
      const done = todayTasks.filter(t => t.status === 'completed').length
      if (todayTasks.length > 0) await window.api.stats.recordDayCompletion(done, todayTasks.length)
      if (stateRef.current.settings.notificationsEnabled) {
        window.api.app.showNotification('Task Completed! 🎉', `"${task.title}" is done.`)
      }
    } catch (e) { console.error('completeTask failed:', e) }
  }, [])

  const skipTask = useCallback(async (id: string) => {
    try {
      const task = stateRef.current.tasks.find(t => t.id === id)
      if (!task) return
      const updated = updateTaskStatus(task, 'skipped')
      await window.api.tasks.update(updated)
      if (stateRef.current.focusSession?.taskId === id) {
        await window.api.focus.end(id)
        dispatch({ type: 'SET_FOCUS_SESSION', payload: null })
      }
      const tasks = await window.api.tasks.getAll()
      dispatch({ type: 'SET_TASKS', payload: tasks })
    } catch (e) { console.error('skipTask failed:', e) }
  }, [])

  const extendTaskTime = useCallback(async (id: string, minutes: number) => {
    try {
      const task = stateRef.current.tasks.find(t => t.id === id)
      if (!task) return
      const extended = extendTask(task, minutes)
      await window.api.tasks.update(extended)
      const tasks = await window.api.tasks.getAll()
      dispatch({ type: 'SET_TASKS', payload: tasks })
    } catch (e) { console.error('extendTaskTime failed:', e) }
  }, [])

  const startFocusMode = useCallback(async (taskId: string) => {
    try {
      const task = stateRef.current.tasks.find(t => t.id === taskId)
      if (!task) return
      if (stateRef.current.focusSession) {
        await window.api.focus.end(stateRef.current.focusSession.taskId)
      }
      const session: FocusSession = { taskId, startedAt: new Date().toISOString(), isActive: true, allowedPackages: [] }
      await window.api.focus.start(session)
      dispatch({ type: 'SET_FOCUS_SESSION', payload: session })
      if (stateRef.current.settings.notificationsEnabled) {
        window.api.app.showNotification('Focus Mode Active 🛡', `Focusing on "${task.title}"`)
      }
    } catch (e) { console.error('startFocusMode failed:', e) }
  }, [])

  const stopFocusMode = useCallback(async () => {
    try {
      if (stateRef.current.focusSession) {
        await window.api.focus.end(stateRef.current.focusSession.taskId)
      }
      dispatch({ type: 'SET_FOCUS_SESSION', payload: null })
    } catch (e) { console.error('stopFocusMode failed:', e) }
  }, [])

  const updateSettings = useCallback(async (settings: AppSettings) => {
    try {
      dispatch({ type: 'SET_SETTINGS', payload: settings })
      await window.api.settings.save(settings)
    } catch (e) { console.error('updateSettings failed:', e) }
  }, [])

  const todayTasks = getTodayTasks(state.tasks)
  const activeTask = getActiveTask(state.tasks)
  const currentTask = getCurrentTask(state.tasks)
  const activeTasks = getAllActiveTasks(state.tasks)

  return (
    <AppContext.Provider value={{ state, todayTasks, activeTask, currentTask, activeTasks, addTask, updateTask, deleteTask, completeTask, skipTask, extendTaskTime, startFocusMode, stopFocusMode, updateSettings, refreshTasks }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
