import express from 'express'
import { join } from 'path'
import {
  initDatabase, getAllTasks, getRecentUnresolvedTasks, getTasksInDateRange,
  getTasksForDate, insertTask, updateTask, deleteTask,
  getSettings, saveSettings,
  startFocusSession, endFocusSession, getActiveFocusSession,
  getTodayFocusMinutes, logFocusOverride,
  getStreak, getBestStreak, getAllTimeFocusMinutes, getAllTimeFocusSessions,
  getRecentDayCompletions, recordDayCompletion, getTodayOverrideCount,
  backfillDayCompletions, getFocusHistory,
  getNoteForDate, saveNote, getRecentNoteDates,
} from './database'

const app = express()
const PORT = 5000

app.use(express.json({ limit: '10mb' }))

initDatabase()
backfillDayCompletions(30)

// ── Tasks ──────────────────────────────────────────────────────────────────
app.get('/svc/tasks', (_req, res) => {
  try { res.json(getAllTasks()) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.get('/svc/tasks/recent-unresolved', (_req, res) => {
  try { res.json(getRecentUnresolvedTasks()) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.get('/svc/tasks/range', (req, res) => {
  try {
    const { start, end } = req.query as { start: string; end: string }
    res.json(getTasksInDateRange(start, end))
  } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.get('/svc/tasks/date/:date', (req, res) => {
  try { res.json(getTasksForDate(req.params.date)) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.post('/svc/tasks', (req, res) => {
  try { insertTask(req.body); res.json({ ok: true }) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.put('/svc/tasks/:id', (req, res) => {
  try { updateTask({ ...req.body, id: req.params.id }); res.json({ ok: true }) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.delete('/svc/tasks/:id', (req, res) => {
  try { deleteTask(req.params.id); res.json({ ok: true }) } catch (e) { res.status(500).json({ error: String(e) }) }
})

// ── Settings ───────────────────────────────────────────────────────────────
app.get('/svc/settings', (_req, res) => {
  try { res.json(getSettings()) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.post('/svc/settings', (req, res) => {
  try { saveSettings(req.body); res.json({ ok: true }) } catch (e) { res.status(500).json({ error: String(e) }) }
})

// ── Focus ──────────────────────────────────────────────────────────────────
app.post('/svc/focus/start', (req, res) => {
  try { startFocusSession(req.body); res.json({ ok: true }) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.post('/svc/focus/end/:taskId', (req, res) => {
  try { endFocusSession(req.params.taskId); res.json({ ok: true }) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.get('/svc/focus/active', (_req, res) => {
  try { res.json(getActiveFocusSession()) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.get('/svc/focus/today-minutes', (_req, res) => {
  try { res.json(getTodayFocusMinutes()) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.post('/svc/focus/log-override', (req, res) => {
  try {
    const { taskId, reason } = req.body
    logFocusOverride(taskId, 'web', reason)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: String(e) }) }
})

// ── Stats ──────────────────────────────────────────────────────────────────
app.get('/svc/stats/streak', (_req, res) => {
  try { res.json(getStreak()) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.get('/svc/stats/best-streak', (_req, res) => {
  try { res.json(getBestStreak()) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.get('/svc/stats/all-time-focus-mins', (_req, res) => {
  try { res.json(getAllTimeFocusMinutes()) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.get('/svc/stats/all-time-sessions', (_req, res) => {
  try { res.json(getAllTimeFocusSessions()) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.get('/svc/stats/recent-day-completions/:days', (req, res) => {
  try { res.json(getRecentDayCompletions(Number(req.params.days))) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.post('/svc/stats/record-day-completion', (req, res) => {
  try {
    const { completed, total } = req.body
    recordDayCompletion(completed, total)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.get('/svc/stats/today-overrides', (_req, res) => {
  try { res.json(getTodayOverrideCount()) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.get('/svc/stats/focus-history/:days', (req, res) => {
  try { res.json(getFocusHistory(Number(req.params.days))) } catch (e) { res.status(500).json({ error: String(e) }) }
})

// ── Notes ──────────────────────────────────────────────────────────────────
app.get('/svc/notes/recent-dates/:days', (req, res) => {
  try { res.json(getRecentNoteDates(Number(req.params.days))) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.get('/svc/notes/:date', (req, res) => {
  try { res.json(getNoteForDate(req.params.date)) } catch (e) { res.status(500).json({ error: String(e) }) }
})
app.post('/svc/notes/:date', (req, res) => {
  try { saveNote(req.params.date, req.body.content ?? ''); res.json({ ok: true }) } catch (e) { res.status(500).json({ error: String(e) }) }
})

// ── App info ───────────────────────────────────────────────────────────────
app.get('/svc/app/version', (_req, res) => { res.json('1.0.0') })

// ── Serve built frontend ───────────────────────────────────────────────────
const distPath = join(process.cwd(), 'dist')
app.use(express.static(distPath))
app.get('*', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FocusFlow running on port ${PORT}`)
})
