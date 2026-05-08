#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# FocusFlow PC — Dev Loop

# Ensure nix-installed tools (curl, git, python3) are on PATH
export PATH="/nix/store/x5hwjkyng8385q1pqhz8wyqkq0izmhpi-replit-runtime-path/bin:/home/runner/.nix-profile/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
#
# Usage:  bash dev-loop.sh
#
# What it does, every run:
#   1. Commit & push latest code to GitHub
#   2. Wait for the GitHub Actions build to start
#   3. Stream live status until the run finishes
#   4. Fetch and print the full build logs
#   5. Exit 0 on success, 1 on failure — so you can fix and re-run
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

GITHUB_TOKEN="${GITHUB_PERSONAL_ACCESS_TOKEN:-}"
GITHUB_USER="TITANICBHAI"
REPO_NAME="FocusFlow-pc"
BRANCH="main"
WORKFLOW_FILE="build.yml"
POLL_INTERVAL=12   # seconds between status polls
MAX_WAIT=1200      # give up after 20 min

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[loop]${RESET} $*"; }
success() { echo -e "${GREEN}[loop]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[loop]${RESET} $*"; }
fail()    { echo -e "${RED}[loop]${RESET} $*"; }

gh_api() {
  # gh_api <method> <path> [body]
  local METHOD="$1" PATH="$2" BODY="${3:-}"
  local URL="https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}${PATH}"
  if [ -n "$BODY" ]; then
    curl -s -X "$METHOD" \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      -d "$BODY" "$URL"
  else
    curl -s -X "$METHOD" \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "$URL"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# 0. Sanity checks
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   FocusFlow PC — Push → Build → Logs     ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""

if [ -z "$GITHUB_TOKEN" ]; then
  fail "GITHUB_PERSONAL_ACCESS_TOKEN is not set."
  fail "Add it as a Replit secret, then re-run this script."
  exit 1
fi

# Verify token works
RATE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit | grep '"remaining"' | head -1 | grep -o '[0-9]*')
if [ -z "$RATE" ]; then
  fail "GitHub token check failed — token may be invalid or expired."
  exit 1
fi
info "GitHub token OK (API calls remaining: $RATE)"

# ─────────────────────────────────────────────────────────────────────────────
# 1. Commit & push
# ─────────────────────────────────────────────────────────────────────────────
echo ""
info "Step 1/4 — Committing and pushing to GitHub..."

REMOTE_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"

# Abort any broken state
git rebase --abort 2>/dev/null || true
git merge --abort  2>/dev/null || true

# Make sure we're on main
CURRENT=$(git symbolic-ref --short HEAD 2>/dev/null || echo "detached")
if [ "$CURRENT" != "main" ]; then
  warn "Not on main — switching..."
  git checkout -B main 2>/dev/null || true
fi

# Stage everything
git add -A

# Commit if there's anything new
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')
if git diff --cached --quiet; then
  info "Nothing new to commit — pushing existing HEAD."
else
  git -c user.email="build@focusflow.app" -c user.name="FocusFlow Build" \
    commit -m "chore: dev-loop sync [${TIMESTAMP}]"
  success "Committed."
fi

# Note time just before push (used to find the new run)
PUSH_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

# Fetch & rebase to avoid rejection
GIT_TERMINAL_PROMPT=0 git fetch "$REMOTE_URL" "main:refs/remotes/origin/main" 2>&1 \
  | grep -v "ghp_" | grep -v "github_pat_" || true
git rebase refs/remotes/origin/main 2>/dev/null || git rebase --abort 2>/dev/null || true

# Push (try normal, then force)
push_result=0
GIT_TERMINAL_PROMPT=0 git push "$REMOTE_URL" "HEAD:main" 2>&1 \
  | grep -v "ghp_" | grep -v "github_pat_" || push_result=$?

if [ "$push_result" != "0" ]; then
  warn "Normal push rejected — force-pushing (Replit is source of truth)..."
  push_result=0
  GIT_TERMINAL_PROMPT=0 git push --force "$REMOTE_URL" "HEAD:main" 2>&1 \
    | grep -v "ghp_" | grep -v "github_pat_" || push_result=$?
fi

if [ "$push_result" != "0" ]; then
  fail "Push failed. Check your token has 'repo' scope and the repo exists."
  exit 1
fi

success "Pushed to https://github.com/${GITHUB_USER}/${REPO_NAME}"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Wait for a new workflow run to appear
# ─────────────────────────────────────────────────────────────────────────────
echo ""
info "Step 2/4 — Waiting for GitHub Actions run to start..."

RUN_ID=""
WAITED=0
while [ -z "$RUN_ID" ]; do
  sleep $POLL_INTERVAL
  WAITED=$((WAITED + POLL_INTERVAL))

  RUNS=$(gh_api GET "/actions/workflows/${WORKFLOW_FILE}/runs?branch=${BRANCH}&per_page=5")
  # Pick the most recent run that started at or after push time
  RUN_ID=$(echo "$RUNS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
runs = data.get('workflow_runs', [])
for r in sorted(runs, key=lambda x: x['created_at'], reverse=True):
    if r['created_at'] >= '$PUSH_TIME':
        print(r['id'])
        break
" 2>/dev/null || true)

  if [ -z "$RUN_ID" ]; then
    info "  ...waiting for run (${WAITED}s elapsed)"
  fi

  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    fail "Timed out waiting for workflow run to start."
    exit 1
  fi
done

success "Run started — ID: $RUN_ID"
echo -e "  ${CYAN}https://github.com/${GITHUB_USER}/${REPO_NAME}/actions/runs/${RUN_ID}${RESET}"

# ─────────────────────────────────────────────────────────────────────────────
# 3. Poll until the run completes
# ─────────────────────────────────────────────────────────────────────────────
echo ""
info "Step 3/4 — Watching build..."

STATUS="queued"
CONCLUSION=""
LAST_JOBS=""
WATCHED=0

while [ "$STATUS" = "queued" ] || [ "$STATUS" = "in_progress" ]; do
  sleep $POLL_INTERVAL
  WATCHED=$((WATCHED + POLL_INTERVAL))

  RUN_DATA=$(gh_api GET "/actions/runs/${RUN_ID}")
  STATUS=$(echo "$RUN_DATA"    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "")
  CONCLUSION=$(echo "$RUN_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('conclusion') or '')" 2>/dev/null || echo "")

  # Print job progress
  JOBS=$(gh_api GET "/actions/runs/${RUN_ID}/jobs")
  JOB_SUMMARY=$(echo "$JOBS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for j in data.get('jobs', []):
    name   = j['name']
    st     = j['status']
    con    = j.get('conclusion') or '-'
    steps  = [s for s in j.get('steps', []) if s['status'] != 'queued']
    step_s = ', '.join(s['name'] for s in steps[-3:]) if steps else ''
    print(f'  [{st}/{con}] {name}  ({step_s})')
" 2>/dev/null || echo "  (fetching jobs...)")

  if [ "$JOB_SUMMARY" != "$LAST_JOBS" ]; then
    echo ""
    echo -e "${BOLD}  Build progress (${WATCHED}s):${RESET}"
    echo "$JOB_SUMMARY"
    LAST_JOBS="$JOB_SUMMARY"
  fi

  if [ "$WATCHED" -ge "$MAX_WAIT" ]; then
    fail "Build is taking longer than expected (>${MAX_WAIT}s). Check GitHub Actions."
    echo -e "  ${CYAN}https://github.com/${GITHUB_USER}/${REPO_NAME}/actions/runs/${RUN_ID}${RESET}"
    exit 1
  fi
done

echo ""
if [ "$CONCLUSION" = "success" ]; then
  success "Build PASSED ✓  (status: $CONCLUSION)"
else
  fail    "Build FAILED ✗  (conclusion: $CONCLUSION)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 4. Fetch and print logs
# ─────────────────────────────────────────────────────────────────────────────
echo ""
info "Step 4/4 — Fetching build logs..."

JOBS=$(gh_api GET "/actions/runs/${RUN_ID}/jobs")
JOB_IDS=$(echo "$JOBS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for j in data.get('jobs', []):
    print(j['id'], j['name'])
" 2>/dev/null || echo "")

while IFS= read -r line; do
  JOB_ID=$(echo "$line" | awk '{print $1}')
  JOB_NAME=$(echo "$line" | cut -d' ' -f2-)
  [ -z "$JOB_ID" ] && continue

  echo ""
  echo -e "${BOLD}────────────────────────────────────────────${RESET}"
  echo -e "${BOLD}  Job: $JOB_NAME${RESET}"
  echo -e "${BOLD}────────────────────────────────────────────${RESET}"

  # Logs come back as a text file (redirect URL)
  LOG_URL="https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/actions/jobs/${JOB_ID}/logs"
  curl -sL \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "$LOG_URL" | tail -200
done <<< "$JOB_IDS"

# ─────────────────────────────────────────────────────────────────────────────
# 5. Final summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════════════${RESET}"
if [ "$CONCLUSION" = "success" ]; then
  success "ALL DONE — build succeeded!"
  echo ""
  echo -e "  Download artifact:"
  echo -e "  ${CYAN}https://github.com/${GITHUB_USER}/${REPO_NAME}/actions/runs/${RUN_ID}${RESET}"
  echo ""
  echo -e "  ${YELLOW}Next step:${RESET} fix anything, then run ${BOLD}bash dev-loop.sh${RESET} again."
  exit 0
else
  fail "Build failed — see logs above for the error."
  echo ""
  echo -e "  Full run: ${CYAN}https://github.com/${GITHUB_USER}/${REPO_NAME}/actions/runs/${RUN_ID}${RESET}"
  echo ""
  echo -e "  ${YELLOW}Fix the error, then run ${BOLD}bash dev-loop.sh${RESET}${YELLOW} again.${RESET}"
  exit 1
fi
