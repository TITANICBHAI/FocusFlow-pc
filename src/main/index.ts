import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, Notification, globalShortcut, dialog } from 'electron'
import { join } from 'path'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { homedir } from 'os'
import {
  initDatabase, getAllTasks, insertTask, updateTask, deleteTask,
  getSettings, saveSettings, startFocusSession, endFocusSession,
  getActiveFocusSession, getTodayFocusMinutes, getStreak, getBestStreak,
  getAllTimeFocusMinutes, getAllTimeFocusSessions, getRecentDayCompletions,
  backfillDayCompletions, recordDayCompletion, getTodayOverrideCount,
  logFocusOverride, getTasksInDateRange, getRecentUnresolvedTasks,
  getNoteForDate, saveNote, getRecentNoteDates, getRecentFocusSessions
} from './database'

// ─── Crash log ────────────────────────────────────────────────────────────────
function getLogPath(): string {
  try { return join(app.getPath('userData'), 'crash.log') }
  catch { return join(homedir(), 'focusflow-crash.log') }
}

function writeLog(label: string, err: unknown): void {
  try {
    const p = getLogPath()
    mkdirSync(join(p, '..'), { recursive: true })
    appendFileSync(p, `[${new Date().toISOString()}] ${label}: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`, 'utf8')
  } catch { /* ignore */ }
}

process.on('uncaughtException', (err) => {
  writeLog('uncaughtException', err)
  try {
    dialog.showErrorBox(
      'FocusFlow — Fatal Error',
      `The app crashed:\n\n${err.message}\n\nCrash log saved to:\n${getLogPath()}`
    )
  } catch { /* dialog not available */ }
  app.exit(1)
})

process.on('unhandledRejection', (reason) => {
  writeLog('unhandledRejection', reason)
})

// ─── Single-instance lock ────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) { app.quit() }

// ─── Helpers ──────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function resPath(name: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, name)
    : join(__dirname, '../../build', name)
}

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: true,
    autoHideMenuBar: true,
    frame: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#f9fafb',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
    icon: resPath('icon.png')
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    const msg = `Renderer failed: ${desc} (${code}) — ${url}`
    writeLog('did-fail-load', msg)
    dialog.showErrorBox('FocusFlow — Load Error', `${msg}\n\nCrash log: ${getLogPath()}`)
  })

  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function createTray(): void {
  let icon: Electron.NativeImage
  try { icon = nativeImage.createFromPath(resPath('tray-icon.png')) }
  catch { icon = nativeImage.createEmpty() }

  const fallback = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  )
  tray = new Tray(icon.isEmpty() ? fallback : icon)

  const buildMenu = () => Menu.buildFromTemplate([
    { label: 'Open FocusFlow', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: 'Today (Ctrl+Shift+1)', click: () => showAndNavigate('today') },
    { label: 'Week (Ctrl+Shift+2)', click: () => showAndNavigate('week') },
    { label: 'Focus (Ctrl+Shift+3)', click: () => showAndNavigate('focus') },
    { label: 'Stats (Ctrl+Shift+4)', click: () => showAndNavigate('stats') },
    { type: 'separator' },
    { label: 'Quit FocusFlow', click: () => { app.isQuiting = true; app.quit() } }
  ])

  tray.setToolTip('FocusFlow — Stay Focused')
  tray.setContextMenu(buildMenu())
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
}

function showAndNavigate(page: string): void {
  mainWindow?.show(); mainWindow?.focus()
  mainWindow?.webContents.send('navigate', page)
}

function registerGlobalShortcuts(): void {
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (mainWindow?.isVisible()) mainWindow.hide()
    else { mainWindow?.show(); mainWindow?.focus() }
  })
  globalShortcut.register('CommandOrControl+Shift+1', () => showAndNavigate('today'))
  globalShortcut.register('CommandOrControl+Shift+2', () => showAndNavigate('week'))
  globalShortcut.register('CommandOrControl+Shift+3', () => showAndNavigate('focus'))
  globalShortcut.register('CommandOrControl+Shift+4', () => showAndNavigate('stats'))
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.on('second-instance', () => {
  if (mainWindow) { if (!mainWindow.isVisible()) mainWindow.show(); mainWindow.focus() }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.tbtechs.focusflow')
  app.on('browser-window-created', (_, window) => { optimizer.watchShortcuts(window) })

  try {
    initDatabase()
    backfillDayCompletions(30)
  } catch (err) {
    writeLog('initDatabase', err)
    dialog.showErrorBox(
      'FocusFlow — Database Error',
      `Failed to open database:\n\n${err instanceof Error ? err.message : String(err)}\n\nCrash log: ${getLogPath()}\n\nThe app will now close.`
    )
    app.quit()
    return
  }

  createWindow()
  createTray()
  registerGlobalShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else { mainWindow?.show(); mainWindow?.focus() }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => { globalShortcut.unregisterAll() })

declare global { namespace Electron { interface App { isQuiting?: boolean } } }

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('tasks:getAll', () => getAllTasks())
ipcMain.handle('tasks:getForDate', (_, date: string) => getAllTasks().filter(t => {
  const d = new Date(t.startTime)
  const day = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const ref = new Date(date)
  const refDay = `${ref.getFullYear()}-${String(ref.getMonth()+1).padStart(2,'0')}-${String(ref.getDate()).padStart(2,'0')}`
  return day === refDay
}))
ipcMain.handle('tasks:getInRange', (_, start: string, end: string) => getTasksInDateRange(start, end))
ipcMain.handle('tasks:getRecentUnresolved', () => getRecentUnresolvedTasks())
ipcMain.handle('tasks:insert', (_, task) => { insertTask(task); return true })
ipcMain.handle('tasks:update', (_, task) => { updateTask(task); return true })
ipcMain.handle('tasks:delete', (_, id: string) => { deleteTask(id); return true })

ipcMain.handle('settings:get', () => getSettings())
ipcMain.handle('settings:save', (_, settings) => { saveSettings(settings); return true })

ipcMain.handle('focus:start', (_, session) => { startFocusSession(session); return true })
ipcMain.handle('focus:end', (_, taskId: string) => { endFocusSession(taskId); return true })
ipcMain.handle('focus:getActive', () => getActiveFocusSession())
ipcMain.handle('focus:getTodayMinutes', () => getTodayFocusMinutes())
ipcMain.handle('focus:logOverride', (_, taskId: string, reason?: string) => { logFocusOverride(taskId, 'manual-override', reason); return true })

ipcMain.handle('stats:getStreak', () => getStreak())
ipcMain.handle('stats:getBestStreak', () => getBestStreak())
ipcMain.handle('stats:getAllTimeFocusMins', () => getAllTimeFocusMinutes())
ipcMain.handle('stats:getAllTimeSessions', () => getAllTimeFocusSessions())
ipcMain.handle('stats:getRecentDayCompletions', (_, days: number) => getRecentDayCompletions(days))
ipcMain.handle('stats:recordDayCompletion', (_, completed: number, total: number) => { recordDayCompletion(completed, total); return true })
ipcMain.handle('stats:getTodayOverrides', () => getTodayOverrideCount())
ipcMain.handle('stats:getRecentSessions', (_, limit?: number) => getRecentFocusSessions(limit ?? 100))

ipcMain.handle('notes:get', (_, date: string) => getNoteForDate(date))
ipcMain.handle('notes:save', (_, date: string, content: string) => { saveNote(date, content); return true })
ipcMain.handle('notes:getRecentDates', (_, days: number) => getRecentNoteDates(days))

ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:showNotification', (_, title: string, body: string, urgency?: 'normal' | 'critical') => {
  const n = new Notification({ title, body, icon: resPath('icon.png'), urgency: urgency ?? 'normal', timeoutType: 'default' })
  n.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
  n.show()
})

ipcMain.handle('app:exportBackup', (_, data: string) => {
  const p = join(homedir(), `focusflow-backup-${Date.now()}.json`)
  writeFileSync(p, data, 'utf-8')
  return p
})

ipcMain.handle('app:importBackup', (_, path: string) => readFileSync(path, 'utf-8'))

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize() })
ipcMain.handle('window:close', () => mainWindow?.hide())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)
