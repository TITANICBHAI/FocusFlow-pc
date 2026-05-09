const BASE = '/svc'

async function get<T>(path: string, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE}${path}`)
      if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
      return res.json()
    } catch (e) {
      if (i === retries - 1) throw e
      await new Promise(r => setTimeout(r, 800 * (i + 1)))
    }
  }
  throw new Error(`GET ${path} failed after ${retries} retries`)
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return res.json()
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`)
  return res.json()
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`)
  return res.json()
}

const eventListeners = new Map<string, Set<(...args: unknown[]) => void>>()

const webApi = {
  tasks: {
    getAll: () => get<unknown[]>('/tasks'),
    getForDate: (date: string) => get<unknown[]>(`/tasks/date/${date}`),
    getInRange: (start: string, end: string) => get<unknown[]>(`/tasks/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
    getRecentUnresolved: () => get<unknown[]>('/tasks/recent-unresolved'),
    insert: (task: unknown) => post('/tasks', task),
    update: (task: unknown) => put(`/tasks/${(task as { id: string }).id}`, task),
    delete: (id: string) => del(`/tasks/${id}`),
  },
  settings: {
    get: () => get<unknown>('/settings'),
    save: (settings: unknown) => post('/settings', settings),
  },
  focus: {
    start: (session: unknown) => post('/focus/start', session),
    end: (taskId: string) => post(`/focus/end/${taskId}`),
    getActive: () => get<unknown>('/focus/active'),
    getTodayMinutes: () => get<number>('/focus/today-minutes'),
    logOverride: (taskId: string, reason?: string) => post('/focus/log-override', { taskId, reason }),
  },
  stats: {
    getStreak: () => get<number>('/stats/streak'),
    getBestStreak: () => get<number>('/stats/best-streak'),
    getAllTimeFocusMins: () => get<number>('/stats/all-time-focus-mins'),
    getAllTimeSessions: () => get<number>('/stats/all-time-sessions'),
    getRecentDayCompletions: (days: number) => get<unknown[]>(`/stats/recent-day-completions/${days}`),
    recordDayCompletion: (completed: number, total: number) => post('/stats/record-day-completion', { completed, total }),
    getTodayOverrides: () => get<number>('/stats/today-overrides'),
    getFocusHistory: (days: number) => get<unknown[]>(`/stats/focus-history/${days}`),
  },
  notes: {
    get: (date: string) => get<string>(`/notes/${date}`),
    save: (date: string, content: string) => post(`/notes/${date}`, { content }),
    getRecentDates: (days: number) => get<string[]>(`/notes/recent-dates/${days}`),
  },
  app: {
    getVersion: () => get<string>('/app/version'),
    showNotification: (title: string, body: string, _urgency?: string) => {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, { body })
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(p => {
            if (p === 'granted') new Notification(title, { body })
          })
        }
      }
      return Promise.resolve()
    },
    exportBackup: (data: string) => {
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `focusflow-backup-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return Promise.resolve('downloaded')
    },
    importBackup: (_path: string) => {
      return new Promise<string>((resolve, reject) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (!file) return reject(new Error('No file selected'))
          const reader = new FileReader()
          reader.onload = (ev) => resolve(ev.target?.result as string)
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsText(file)
        }
        input.click()
      })
    },
    triggerDailySummary: () => Promise.resolve(),
  },
  window: {
    minimize: () => Promise.resolve(),
    maximize: () => Promise.resolve(),
    close: () => Promise.resolve(),
    isMaximized: () => Promise.resolve(false),
  },
  overlay: {
    show: () => Promise.resolve(),
    hide: () => Promise.resolve(),
    update: (_state: unknown) => Promise.resolve(),
    skip: () => Promise.resolve(),
    stop: () => Promise.resolve(),
  },
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    if (!eventListeners.has(channel)) eventListeners.set(channel, new Set())
    eventListeners.get(channel)!.add(listener)
  },
  off: (channel: string, listener: (...args: unknown[]) => void) => {
    eventListeners.get(channel)?.delete(listener)
  },
}

declare global {
  interface Window {
    api: typeof webApi
  }
}

window.api = webApi
