#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# FocusFlow PC — Dev Loop
# Usage: bash dev-loop.sh
#
# Loop: commit → push → watch GitHub Actions → print logs → exit
# Fix errors shown in logs, then run again.
# ─────────────────────────────────────────────────────────────────────────────

GITHUB_USER="TITANICBHAI"
REPO_NAME="FocusFlow-pc"
BRANCH="main"
WORKFLOW_FILE="build.yml"
POLL_INTERVAL=15
MAX_WAIT=1200

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[loop]${RESET} $*"; }
success() { echo -e "${GREEN}[loop]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[loop]${RESET} $*"; }
fail()    { echo -e "${RED}[loop]${RESET} $*"; }

API="node $(dirname "$0")/dev-loop-api.js"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   FocusFlow PC — Push → Build → Logs     ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""

# ── 0. Token check ────────────────────────────────────────────────────────────
GITHUB_TOKEN="${GITHUB_PERSONAL_ACCESS_TOKEN:-}"
if [ -z "$GITHUB_TOKEN" ]; then
  fail "GITHUB_PERSONAL_ACCESS_TOKEN secret is not set."
  fail "Add it in Replit Secrets, then re-run."
  exit 1
fi
export GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_TOKEN"

RATE=$($API check-token 2>&1)
if [ $? -ne 0 ]; then
  fail "GitHub token invalid or expired ($RATE)"
  exit 1
fi
info "GitHub token OK (API calls remaining: $RATE)"

# ── 1. Commit & Push ──────────────────────────────────────────────────────────
echo ""
info "Step 1/4 — Committing and pushing to GitHub..."

REMOTE_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"

git rebase --abort 2>/dev/null || true
git merge --abort  2>/dev/null || true
rm -f .git/index.lock .git/MERGE_HEAD .git/rebase-merge/end 2>/dev/null || true

CURRENT=$(git symbolic-ref --short HEAD 2>/dev/null || echo "detached")
if [ "$CURRENT" != "main" ]; then
  warn "Not on main — switching..."
  git checkout -B main 2>/dev/null || true
fi

git add -A

TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')
if git diff --cached --quiet; then
  # Nothing staged — write a tiny timestamp file so we always have a new commit
  echo "$TIMESTAMP" > .dev-loop-ping
  git add .dev-loop-ping
fi

git -c user.email="build@focusflow.app" -c user.name="FocusFlow Build" \
  commit -m "chore: dev-loop sync [${TIMESTAMP}]"
success "Committed."

# Snapshot time right before push — used to identify the triggered run
PUSH_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

# Fetch + rebase to stay current, then push
GIT_TERMINAL_PROMPT=0 git fetch "$REMOTE_URL" "main:refs/remotes/origin/main" 2>&1 \
  | grep -v "ghp_" | grep -v "github_pat_" || true
git rebase refs/remotes/origin/main 2>/dev/null || git rebase --abort 2>/dev/null || true

push_rc=0
GIT_TERMINAL_PROMPT=0 git push "$REMOTE_URL" "HEAD:main" 2>&1 \
  | grep -v "ghp_" | grep -v "github_pat_" || push_rc=$?

if [ "$push_rc" != "0" ]; then
  warn "Normal push rejected — force-pushing (Replit is source of truth)..."
  push_rc=0
  GIT_TERMINAL_PROMPT=0 git push --force "$REMOTE_URL" "HEAD:main" 2>&1 \
    | grep -v "ghp_" | grep -v "github_pat_" || push_rc=$?
fi

if [ "$push_rc" != "0" ]; then
  fail "Push failed. Verify token has 'repo' scope and the repo exists."
  exit 1
fi

success "Pushed → https://github.com/${GITHUB_USER}/${REPO_NAME}"

# ── 2. Wait for Actions run ───────────────────────────────────────────────────
echo ""
info "Step 2/4 — Waiting for GitHub Actions run to start..."

RUN_ID=$($API wait-for-run "$WORKFLOW_FILE" "$BRANCH" "$PUSH_TIME" "$POLL_INTERVAL" "$MAX_WAIT" 2>&1)
if [ $? -ne 0 ]; then
  fail "Timed out or error waiting for run: $RUN_ID"
  exit 1
fi

success "Run started — ID: $RUN_ID"
echo -e "  ${CYAN}https://github.com/${GITHUB_USER}/${REPO_NAME}/actions/runs/${RUN_ID}${RESET}"

# ── 3. Poll until complete ────────────────────────────────────────────────────
echo ""
info "Step 3/4 — Watching build (updates every ${POLL_INTERVAL}s)..."

STATUS="queued"
CONCLUSION=""
LAST_JOBS=""
WATCHED=0

while [ "$STATUS" = "queued" ] || [ "$STATUS" = "in_progress" ]; do
  sleep $POLL_INTERVAL
  WATCHED=$((WATCHED + POLL_INTERVAL))

  RUN_INFO=$($API poll-run "$RUN_ID" 2>/dev/null)
  STATUS=$(node -e "try{const d=JSON.parse(process.argv[1]);process.stdout.write(d.status)}catch{}" -- "$RUN_INFO" 2>/dev/null || echo "")
  CONCLUSION=$(node -e "try{const d=JSON.parse(process.argv[1]);process.stdout.write(d.conclusion||'')}catch{}" -- "$RUN_INFO" 2>/dev/null || echo "")

  JOB_SUMMARY=$($API jobs-summary "$RUN_ID" 2>/dev/null || echo "  (fetching jobs...)")

  if [ "$JOB_SUMMARY" != "$LAST_JOBS" ]; then
    echo ""
    echo -e "${BOLD}  Build progress (${WATCHED}s):${RESET}"
    echo "$JOB_SUMMARY"
    LAST_JOBS="$JOB_SUMMARY"
  fi

  if [ "$WATCHED" -ge "$MAX_WAIT" ]; then
    fail "Build exceeded ${MAX_WAIT}s. Check GitHub Actions manually."
    echo -e "  ${CYAN}https://github.com/${GITHUB_USER}/${REPO_NAME}/actions/runs/${RUN_ID}${RESET}"
    exit 1
  fi
done

echo ""
if [ "$CONCLUSION" = "success" ]; then
  success "Build PASSED ✓"
else
  fail "Build FAILED ✗  (conclusion: $CONCLUSION)"
fi

# ── 4. Fetch & print logs ─────────────────────────────────────────────────────
echo ""
info "Step 4/4 — Fetching build logs..."

$API list-job-ids "$RUN_ID" 2>/dev/null | while IFS= read -r line; do
  JOB_ID=$(echo "$line" | awk '{print $1}')
  JOB_NAME=$(echo "$line" | cut -d' ' -f2-)
  [ -z "$JOB_ID" ] && continue

  echo ""
  echo -e "${BOLD}────────────────────────────────────────────${RESET}"
  echo -e "${BOLD}  Job: $JOB_NAME${RESET}"
  echo -e "${BOLD}────────────────────────────────────────────${RESET}"
  $API job-log "$JOB_ID" 2>/dev/null
done

# ── 5. Final result ───────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════════════${RESET}"
if [ "$CONCLUSION" = "success" ]; then
  success "ALL DONE — build succeeded!"
  echo ""
  echo -e "  Download .exe from Artifacts:"
  echo -e "  ${CYAN}https://github.com/${GITHUB_USER}/${REPO_NAME}/actions/runs/${RUN_ID}${RESET}"
  echo ""
  echo -e "  ${YELLOW}Make changes, then run ${BOLD}bash dev-loop.sh${RESET}${YELLOW} again.${RESET}"
  exit 0
else
  fail "Build failed — read the logs above to find the error."
  echo ""
  echo -e "  Full run: ${CYAN}https://github.com/${GITHUB_USER}/${REPO_NAME}/actions/runs/${RUN_ID}${RESET}"
  echo ""
  echo -e "  ${YELLOW}Fix the error, then run ${BOLD}bash dev-loop.sh${RESET}${YELLOW} again.${RESET}"
  exit 1
fi
