import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, Notification } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, getAllTasks, insertTask, updateTask, deleteTask, getSettings, saveSettings, startFocusSession, endFocusSession, getActiveFocusSession, getTodayFocusMinutes, getStreak, getBestStreak, getAllTimeFocusMinutes, getAllTimeFocusSessions, getRecentDayCompletions, backfillDayCompletions, recordDayCompletion, getTodayOverrideCount, logFocusOverride, getTasksInDateRange, getRecentUnresolvedTasks } from './database'
import { readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    frame: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: join(__dirname, '../../build/icon.png')
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
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
  const iconPath = join(__dirname, '../../build/tray-icon.png')
  let icon: Electron.NativeImage
  try {
    icon = nativeImage.createFromPath(iconPath)
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon.isEmpty() ? nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFpSURBVDiNpZM9SwNBEIafvYuJGD9Q0EIsLCwsLCwsLC0sLCwsFBQUFBQUFBT8AQoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCg==') : icon)

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open FocusFlow', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit() } }
  ])

  tray.setToolTip('FocusFlow')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.tbtechs.focusflow')
  app.on('browser-window-created', (_, window) => { optimizer.watchShortcuts(window) })

  initDatabase()
  backfillDayCompletions(30)
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else { mainWindow?.show(); mainWindow?.focus() }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

declare global { namespace Electron { interface App { isQuiting?: boolean } } }

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('tasks:getAll', () => getAllTasks())
ipcMain.handle('tasks:getForDate', (_, date: string) => getAllTasks().filter(t => {
  const d = new Date(t.startTime); const day = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const ref = new Date(date); const refDay = `${ref.getFullYear()}-${String(ref.getMonth()+1).padStart(2,'0')}-${String(ref.getDate()).padStart(2,'0')}`
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

ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:showNotification', (_, title: string, body: string) => {
  new Notification({ title, body }).show()
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
