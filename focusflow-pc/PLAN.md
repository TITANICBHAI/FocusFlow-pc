# FocusFlow PC — Build Plan & Progress Tracker
> Last updated: 2026-05-01 | Check this file before starting any new work.

## Project Goal
Port FocusFlow Android app → Full PC desktop app  
**Stack: Electron 29 · React 18 · TypeScript 5 · Tailwind CSS 3 · better-sqlite3 · electron-builder**  
Deploy: GitHub + GitHub Actions → Windows `.exe` auto-build on every push

---

## Phase Status Overview
| Phase | Status | Notes |
|-------|--------|-------|
| 1. Source Analysis | ✅ DONE | All 10+ screens studied |
| 2. Project Structure | ✅ DONE | All configs created |
| 3. Main Process | ✅ DONE | IPC + SQLite |
| 4. Preload & Types | ✅ DONE | contextBridge + TypeScript |
| 5. React Renderer | ✅ DONE | Entry, CSS, theme |
| 6. Global State | ✅ DONE | AppContext w/ all actions |
| 7. App Shell | ✅ DONE | Sidebar nav + TitleBar |
| 8. All 8 Screens | ✅ DONE | 1717 lines of screen code |
| 9. Build Tooling & CI | ✅ DONE | GitHub Actions .yml |
| 10. Build Verification | ✅ DONE | 50 modules, 0 errors |
| 11. GitHub Push | 🔴 BLOCKED | Token expired — needs renewal |
| 12. CI Verification | 🔲 TODO | After push succeeds |

---

## ✅ Phase 1: Source Analysis (DONE)
- [x] Clone https://github.com/TITANICBHAI/FocusFlow
- [x] types.ts (Task, AppSettings, UserProfile, FocusSession, etc.)
- [x] database.ts (SQLite schema, all DB query functions)
- [x] AppContext.tsx (state, actions, focus mode, backfill)
- [x] TodayTab → TodayScreen (schedule, add/edit/skip/extend, active banner)
- [x] FocusTab → FocusScreen (SVG ring timer, focus mode, overrides)
- [x] StatsTab → StatsScreen (heatmap, streaks, milestones, bar chart)
- [x] SettingsTab → SettingsScreen (dark mode, pomodoro, notifications, blockers)
- [x] ReportsScreen (focus hero, breakdown, distraction count)
- [x] ActiveScreen (live enforcement dashboard)
- [x] AlwaysOnScreen → Adapted as Blocked Websites (PC equiv)
- [x] BlockDefenseScreen → Merged into Settings PC tab
- [x] KeywordBlockerScreen → KeywordModal in Settings
- [x] UserProfileScreen → ProfileScreen
- [x] OnboardingScreen (5-step wizard)

---

## ✅ Phase 2: Project Structure (DONE)
- [x] `package.json` — Electron 29, electron-vite 2, React 18, TS 5, Tailwind 3
- [x] `electron.vite.config.ts` — Main/preload/renderer build config
- [x] `tsconfig.json` + `tsconfig.node.json` + `tsconfig.web.json`
- [x] `tailwind.config.js` + `postcss.config.js`
- [x] `.gitignore`

---

## ✅ Phase 3: Electron Main Process (DONE)
**`src/main/index.ts`** — BrowserWindow + Tray + 20+ IPC handlers
- IPC: tasks (getAll, getForDate, getInRange, getRecentUnresolved, insert, update, delete)
- IPC: focus (start, end, getActive, getTodayMinutes, logOverride)
- IPC: stats (getStreak, getBestStreak, getAllTimeFocusMins, getAllTimeSessions, getRecentDayCompletions, recordDayCompletion, getTodayOverrides)
- IPC: app (getVersion, showNotification, exportBackup, importBackup)
- IPC: window (minimize, maximize, close)
- System tray with context menu + minimize-to-tray

**`src/main/database.ts`** — better-sqlite3 SQLite (WAL mode)
- Tables: tasks, settings, focus_sessions, focus_overrides, daily_completions
- All CRUD + streak/completion/override analytics

---

## ✅ Phase 4: Preload & Types (DONE)
- [x] `src/preload/index.ts` — contextBridge exposing window.api (no nodeIntegration)
- [x] `src/renderer/src/data/types.ts` — Task, AppSettings, UserProfile, FocusSession, BlockedWebsite, RecurringBlockSchedule, Reminder
- [x] `src/renderer/src/env.d.ts` — Global window.api TypeScript declaration

---

## ✅ Phase 5: React Renderer (DONE)
- [x] `src/renderer/index.html` — Inter font, CSP headers
- [x] `src/renderer/src/main.tsx` — ReactDOM + dayjs plugins
- [x] `src/renderer/src/index.css` — Tailwind + custom animations (pulse-ring, spin-slow, fade-in, slide-up, ripple)
- [x] `src/renderer/src/styles/theme.ts` — COLORS, TASK_COLORS

---

## ✅ Phase 6: Global State (DONE)
**`src/renderer/src/context/AppContext.tsx`**
- useReducer (tasks, settings, focusSession, isDbReady)
- All task actions: add, update, delete, complete, skip, extend
- Focus: startFocusMode, stopFocusMode
- Auto dark-mode class toggle
- 60s background refresh + daily completion recording
- 5-min pre-task notification scheduling

---

## ✅ Phase 7: App Shell (DONE)
**`src/renderer/src/App.tsx`**
- Custom TitleBar (minimize/maximize/close buttons, drag region)
- Sidebar (Today, Focus, Stats, Settings, Active, Reports, Profile)
- Loading skeleton while DB initializes
- Onboarding gate (shows wizard on first launch)
- StreakChip in sidebar

---

## ✅ Phase 8: All Screens (DONE — 1717 lines total)

### TodayScreen.tsx (344 lines)
- [x] Color-coded task cards with status icons
- [x] Priority badges + tag chips
- [x] Active/awaiting banner (live task with 1-tap actions)
- [x] Add Task modal (title, desc, datetime, duration, priority, color picker, tags, focus toggle)
- [x] Edit Task modal (same fields + delete button)
- [x] Extend modal (+15/30/45/60/90 min options)
- [x] Empty state with CTA

### FocusScreen.tsx (180 lines)
- [x] SVG ring timer (progress arc, countdown MM:SS, % done)
- [x] Animated ripple rings during focus mode
- [x] Slow-spin animation on ring during focus
- [x] Time's-up prompt (Done/Extend/Skip)
- [x] Emergency override button (logs to DB)
- [x] No-task empty state with upcoming task preview

### StatsScreen.tsx (283 lines)
- [x] 4 filter tabs: Today / Yesterday / Week / All Time
- [x] Focus time hero card with smart motivational copy
- [x] Task breakdown with animated progress bars
- [x] 7-day bar chart
- [x] 12-week activity heatmap (gradient: grey→light indigo→indigo→dark indigo)
- [x] 6 milestone badges (1h/10h focus, 10/100 sessions, 7d/30d streak) with earned/locked state

### SettingsScreen.tsx (239 lines)
- [x] Profile shortcut row (name + occupation)
- [x] Dark mode toggle
- [x] Default task duration selector (30/45/60/90/120m chips)
- [x] Focus mode options (auto-enable, keep-until-task-end)
- [x] Pomodoro (toggle + duration/break sliders)
- [x] Notification + weekly report toggles
- [x] Blocked Websites modal (PC-adapted app blocker)
- [x] Keyword Blocker modal with quick presets
- [x] Backup export to JSON, Reports shortcut
- [x] Danger zone: Clear All Tasks

### ProfileScreen.tsx (153 lines)
- [x] Name input
- [x] Occupation chips (Student/Professional/Freelancer/Creator/Other)
- [x] Daily goal slider (1–12h)
- [x] Wake-up time chips
- [x] Sleep time chips
- [x] Chronotype selector (6 options)
- [x] Focus goals multi-select (8 options)
- [x] Distraction triggers multi-select (8 options)
- [x] Motivation style multi-select (4 options)

### ReportsScreen.tsx (210 lines)
- [x] Range tabs: Today / Yesterday / Week / All Time
- [x] Focus time hero with motivational feedback (emoji + message)
- [x] Override count warning card
- [x] Task breakdown (completed/remaining/skipped bars + rate)
- [x] Weekly 7-day bar chart
- [x] All-time stats grid (focus hours, sessions, best streak, longest task)

### ActiveScreen.tsx (141 lines)
- [x] Focus session card (live task, pulse indicator, stop button)
- [x] Today's stats (focus time, completion %, override count)
- [x] Enforcement layers list (Focus, Websites, Keywords, Pomodoro) with ON/OFF badges
- [x] Quick action grid (Today/Focus/Reports/Settings)

### OnboardingScreen.tsx (167 lines)
- [x] 5-step wizard with gradient hero header
- [x] Step progress bars
- [x] Welcome screen (feature list)
- [x] Name + occupation chips
- [x] Focus goals multi-select (validation: must pick ≥1)
- [x] Daily goal slider
- [x] Welcome summary with profile recap

---

## ✅ Phase 9: Build Tooling & CI (DONE)
- [x] `build/icon.png` — 512×512 indigo app icon
- [x] `build/tray-icon.png` — 64×64 system tray icon
- [x] `.github/workflows/build.yml`
  - Trigger: push to `main`, PRs, version tags (`v*`)
  - Job `build-windows`: windows-latest → npm ci → build → package:win → upload .exe artifact
  - Job `release`: runs on `v*` tags, creates GitHub Release with .exe attached
- [x] `README.md` — Full docs (features, tech stack, dev guide, project structure)

---

## ✅ Phase 10: Build Verification (DONE)
- [x] `npm install --ignore-scripts` → 436 packages, 0 errors
- [x] `npx electron-vite build` → ALL PASSED
  - Main: 3 modules → `out/main/index.js` (19.76 kB) ✓
  - Preload: 1 module → `out/preload/index.js` (2.47 kB) ✓
  - Renderer: 50 modules → `out/renderer/` (375 kB JS + 36 kB CSS) ✓
- [x] Fixed apostrophe syntax error in OnboardingScreen.tsx (line 23)

---

## 🔴 Phase 11: GitHub Push (BLOCKED — TOKEN EXPIRED)

**Problem:** `GITHUB_PERSONAL_ACCESS_TOKEN` returns HTTP 401 "Bad credentials"  
**Root cause:** Token was revoked or expired on GitHub  

**Fix required:**
1. Go to https://github.com/settings/tokens/new (classic)
2. Name: `focusflow-pc-deploy`
3. Expiration: 90 days (or No expiration)
4. Scopes: ✅ `repo` (all), ✅ `workflow`
5. Click "Generate token" → copy the `ghp_xxx` value
6. In Replit: Secrets → update `GITHUB_PERSONAL_ACCESS_TOKEN` → paste new token
7. Tell the agent to continue

**What happens when token is valid:**
- [ ] Create GitHub repo `TITANICBHAI/focusflow-pc` via API
- [ ] Upload all 33 source files via GitHub Contents API
- [ ] Verify repo at https://github.com/TITANICBHAI/focusflow-pc
- [ ] Confirm `.github/workflows/build.yml` is visible in Actions tab
- [ ] Confirm Actions build auto-triggers on push

---

## 🔲 Phase 12: CI Verification (TODO)
- [ ] Check GitHub Actions tab — `build-windows` job starts automatically
- [ ] Job: Node 20 setup → npm ci → electron-vite build → electron-builder --win
- [ ] .exe artifact uploaded (available in Actions run summary)
- [ ] Tag `v1.0.0` → verify Release job creates GitHub Release with .exe
- [ ] Download .exe and confirm it installs on Windows

---

## All 33 Project Files
```
.github/workflows/build.yml      ← GitHub Actions (Windows .exe build)
.gitignore
build/icon.png                   ← 512×512 app icon
build/tray-icon.png              ← 64×64 system tray icon
electron.vite.config.ts
package.json
package-lock.json
postcss.config.js
push-to-github.sh                ← Manual push helper script
README.md
src/main/database.ts             ← SQLite (better-sqlite3, WAL)
src/main/index.ts                ← Electron main + IPC + Tray
src/preload/index.ts             ← contextBridge API
src/renderer/index.html
src/renderer/src/App.tsx         ← Shell + sidebar + TitleBar
src/renderer/src/context/AppContext.tsx
src/renderer/src/data/types.ts
src/renderer/src/env.d.ts
src/renderer/src/index.css
src/renderer/src/main.tsx
src/renderer/src/screens/ActiveScreen.tsx
src/renderer/src/screens/FocusScreen.tsx
src/renderer/src/screens/OnboardingScreen.tsx
src/renderer/src/screens/ProfileScreen.tsx
src/renderer/src/screens/ReportsScreen.tsx
src/renderer/src/screens/SettingsScreen.tsx
src/renderer/src/screens/StatsScreen.tsx
src/renderer/src/screens/TodayScreen.tsx
src/renderer/src/services/taskService.ts
src/renderer/src/styles/theme.ts
tailwind.config.js
tsconfig.json
tsconfig.node.json
tsconfig.web.json
```

---

## Quick Reference: How to Push When Token is Ready

**Option A — Automated (run inside Replit shell):**
```bash
node /tmp/push-to-github.mjs
```

**Option B — Manual (local terminal):**
```bash
cd /home/runner/workspace/focusflow-pc
GITHUB_TOKEN=ghp_YOUR_TOKEN bash push-to-github.sh
```
