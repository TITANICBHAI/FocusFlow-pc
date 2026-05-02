import { contextBridge, ipcRenderer } from 'electron'

// Map original listener → wrapped listener so off() can deregister properly
const _wrapperMap = new Map<
  (...args: unknown[]) => void,
  (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
>()

const api = {
  tasks: {
    getAll: () => ipcRenderer.invoke('tasks:getAll'),
    getForDate: (date: string) => ipcRenderer.invoke('tasks:getForDate', date),
    getInRange: (start: string, end: string) => ipcRenderer.invoke('tasks:getInRange', start, end),
    getRecentUnresolved: () => ipcRenderer.invoke('tasks:getRecentUnresolved'),
    insert: (task: unknown) => ipcRenderer.invoke('tasks:insert', task),
    update: (task: unknown) => ipcRenderer.invoke('tasks:update', task),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings: unknown) => ipcRenderer.invoke('settings:save', settings),
  },
  focus: {
    start: (session: unknown) => ipcRenderer.invoke('focus:start', session),
    end: (taskId: string) => ipcRenderer.invoke('focus:end', taskId),
    getActive: () => ipcRenderer.invoke('focus:getActive'),
    getTodayMinutes: () => ipcRenderer.invoke('focus:getTodayMinutes'),
    logOverride: (taskId: string, reason?: string) => ipcRenderer.invoke('focus:logOverride', taskId, reason),
  },
  stats: {
    getStreak: () => ipcRenderer.invoke('stats:getStreak'),
    getBestStreak: () => ipcRenderer.invoke('stats:getBestStreak'),
    getAllTimeFocusMins: () => ipcRenderer.invoke('stats:getAllTimeFocusMins'),
    getAllTimeSessions: () => ipcRenderer.invoke('stats:getAllTimeSessions'),
    getRecentDayCompletions: (days: number) => ipcRenderer.invoke('stats:getRecentDayCompletions', days),
    recordDayCompletion: (completed: number, total: number) => ipcRenderer.invoke('stats:recordDayCompletion', completed, total),
    getTodayOverrides: () => ipcRenderer.invoke('stats:getTodayOverrides'),
    getFocusHistory: (days: number) => ipcRenderer.invoke('stats:getFocusHistory', days),
  },
  notes: {
    get: (date: string) => ipcRenderer.invoke('notes:get', date),
    save: (date: string, content: string) => ipcRenderer.invoke('notes:save', date, content),
    getRecentDates: (days: number) => ipcRenderer.invoke('notes:getRecentDates', days),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    showNotification: (title: string, body: string, urgency?: 'normal' | 'critical') => ipcRenderer.invoke('app:showNotification', title, body, urgency),
    exportBackup: (data: string) => ipcRenderer.invoke('app:exportBackup', data),
    importBackup: (path: string) => ipcRenderer.invoke('app:importBackup', path),
    triggerDailySummary: () => ipcRenderer.invoke('app:triggerDailySummary'),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  overlay: {
    show: () => ipcRenderer.invoke('overlay:show'),
    hide: () => ipcRenderer.invoke('overlay:hide'),
    update: (state: unknown) => ipcRenderer.invoke('overlay:update', state),
    skip: () => ipcRenderer.invoke('overlay:skip'),
    stop: () => ipcRenderer.invoke('overlay:stop'),
  },
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    const wrapper = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => listener(...args)
    _wrapperMap.set(listener, wrapper)
    ipcRenderer.on(channel, wrapper)
  },
  off: (channel: string, listener: (...args: unknown[]) => void) => {
    const wrapper = _wrapperMap.get(listener)
    if (wrapper) {
      ipcRenderer.off(channel, wrapper)
      _wrapperMap.delete(listener)
    }
  },
}

export type ElectronAPI = typeof api

contextBridge.exposeInMainWorld('api', api)
