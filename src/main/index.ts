import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, Notification, globalShortcut, dialog } from 'electron'
import { join } from 'path'
import { appendFileSync, mkdirSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'

// ─── Crash log (written before anything else) ────────────────────────────────
function getLogPath(): string {
  try {
    return join(app.getPath('userData'), 'crash.log')
  } catch {
    return join(homedir(), 'focusflow-crash.log')
  }
}

function writeLog(label: string, err: unknown): void {
  try {
    const logPath = getLogPath()
    mkdirSync(join(logPath, '..'), { recursive: true })
    const msg = `[${new Date().toISOString()}] ${label}: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`
    appendFileSync(logPath, msg, 'utf8')
  } catch { /* ignore log failures */ }
}

process.on('uncaughtException', (err) => {
  writeLog('uncaughtException', err)
  try {
    dialog.showErrorBox(
      'FocusFlow — Fatal Error',
      `The app crashed unexpectedly:\n\n${err.message}\n\nA crash log has been saved to:\n${getLogPath()}`
    )
  } catch { /* dialog might not be available */ }
  app.exit(1)
})

process.on('unhandledRejection', (reason) => {
  writeLog('unhandledRejection', reason)
})

// ─── Single-instance lock ────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

// ─── Lazy-load database (so import errors are catchable) ─────────────────────
let dbModule: typeof import('./database') | null = null

function loadDatabase(): typeof import('./database') {
  if (!dbModule) {
    dbModule = require('./database') as typeof import('./database')
  }
  return dbModule
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function iconPath(name: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, name)
    : join(__dirname, '../../build', name)
}

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
    icon: iconPath('icon.png')
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    const msg = `Failed to load renderer: ${desc} (${code})\nURL: ${url}`
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

function createTray(): void {
  const trayIcon = iconPath('tray-icon.png')
  let icon: Electron.NativeImage
  try {
    icon = nativeImage.createFromPath(trayIcon)
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon.isEmpty()
    ? nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
    : icon)

  const buildMenu = () => Menu.buildFromTemplate([
    { label: 'Open FocusFlow', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: 'Today (Ctrl+Shift+1)', click: () => { showAndNavigate('today') } },
    { label: 'Week (Ctrl+Shift+2)', click: () => { showAndNavigate('week') } },
    { label: 'Focus (Ctrl+Shift+3)', click: () => { showAndNavigate('focus') } },
    { label: 'Stats (Ctrl+Shift+4)', click: () => { showAndNavigate('stats') } },
    { type: 'separator' },
    { label: 'Quit FocusFlow', click: () => { app.isQuiting = true; app.quit() } }
  ])

  tray.setToolTip('FocusFlow — Stay Focused')
  tray.setContextMenu(buildMenu())
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
}

function showAndNavigate(page: string): void {
  mainWindow?.show()
  mainWindow?.focus()
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

app.on('second-instance', () => {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()
  }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.tbtechs.focusflow')
  app.on('browser-window-created', (_, window) => { optimizer.watchShortcuts(window) })

  try {
    const db = loadDatabase()
    db.initDatabase()
    db.backfillDayCompletions(30)
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

declare global { namespace Electron { interface App { isQuiting?: boolean } } }

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('tasks:getAll', () => loadDatabase().getAllTasks())
ipcMain.handle('tasks:getForDate', (_, date: string) => loadDatabase().getAllTasks().filter(t => {
  const d = new Date(t.startTime); const day = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const ref = new Date(date); const refDay = `${ref.getFullYear()}-${String(ref.getMonth()+1).padStart(2,'0')}-${String(ref.getDate()).padStart(2,'0')}`
  return day === refDay
}))
ipcMain.handle('tasks:getInRange', (_, start: string, end: string) => loadDatabase().getTasksInDateRange(start, end))
ipcMain.handle('tasks:getRecentUnresolved', () => loadDatabase().getRecentUnresolvedTasks())
ipcMain.handle('tasks:insert', (_, task) => { loadDatabase().insertTask(task); return true })
ipcMain.handle('tasks:update', (_, task) => { loadDatabase().updateTask(task); return true })
ipcMain.handle('tasks:delete', (_, id: string) => { loadDatabase().deleteTask(id); return true })

ipcMain.handle('settings:get', () => loadDatabase().getSettings())
ipcMain.handle('settings:save', (_, settings) => { loadDatabase().saveSettings(settings); return true })

ipcMain.handle('focus:start', (_, session) => { loadDatabase().startFocusSession(session); return true })
ipcMain.handle('focus:end', (_, taskId: string) => { loadDatabase().endFocusSession(taskId); return true })
ipcMain.handle('focus:getActive', () => loadDatabase().getActiveFocusSession())
ipcMain.handle('focus:getTodayMinutes', () => loadDatabase().getTodayFocusMinutes())
ipcMain.handle('focus:logOverride', (_, taskId: string, reason?: string) => { loadDatabase().logFocusOverride(taskId, 'manual-override', reason); return true })

ipcMain.handle('stats:getStreak', () => loadDatabase().getStreak())
ipcMain.handle('stats:getBestStreak', () => loadDatabase().getBestStreak())
ipcMain.handle('stats:getAllTimeFocusMins', () => loadDatabase().getAllTimeFocusMinutes())
ipcMain.handle('stats:getAllTimeSessions', () => loadDatabase().getAllTimeFocusSessions())
ipcMain.handle('stats:getRecentDayCompletions', (_, days: number) => loadDatabase().getRecentDayCompletions(days))
ipcMain.handle('stats:recordDayCompletion', (_, completed: number, total: number) => { loadDatabase().recordDayCompletion(completed, total); return true })
ipcMain.handle('stats:getTodayOverrides', () => loadDatabase().getTodayOverrideCount())
ipcMain.handle('stats:getRecentSessions', (_, limit?: number) => loadDatabase().getRecentFocusSessions(limit ?? 100))

ipcMain.handle('notes:get', (_, date: string) => loadDatabase().getNoteForDate(date))
ipcMain.handle('notes:save', (_, date: string, content: string) => { loadDatabase().saveNote(date, content); return true })
ipcMain.handle('notes:getRecentDates', (_, days: number) => loadDatabase().getRecentNoteDates(days))

ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:showNotification', (_, title: string, body: string, urgency?: 'normal' | 'critical') => {
  const n = new Notification({
    title,
    body,
    icon: iconPath('icon.png'),
    urgency: urgency ?? 'normal',
    timeoutType: 'default',
  })
  n.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
  n.show()
})

ipcMain.handle('app:exportBackup', (_, data: string) => {
  const path = join(homedir(), `focusflow-backup-${Date.now()}.json`)
  writeFileSync(path, data, 'utf-8')
  return path
})

ipcMain.handle('app:importBackup', (_, path: string) => {
  return readFileSync(path, 'utf-8')
})

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize() })
ipcMain.handle('window:close', () => mainWindow?.hide())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)
