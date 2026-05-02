#!/bin/bash
# FocusFlow PC — GitHub Push Script
# Configured as a Replit workflow — restart to push latest changes.
set -o pipefail

GITHUB_TOKEN=${GITHUB_TOKEN:-$GITHUB_PERSONAL_ACCESS_TOKEN}
GITHUB_USER="TITANICBHAI"
REPO_NAME="FocusFlow-pc"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN or GITHUB_PERSONAL_ACCESS_TOKEN must be set."
  exit 1
fi

echo "=== FocusFlow PC — Push to GitHub ==="
echo "Repo: https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""

cd "$(dirname "$0")"

REMOTE_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"

# Helper: run git push and hide the token from logs, return real git exit code
safe_push() {
  local flags=("$@")
  GIT_TERMINAL_PROMPT=0 git push "${flags[@]}" "$REMOTE_URL" HEAD:main 2>&1 | grep -v "ghp_" | grep -v "github_pat_" || true
  return ${PIPESTATUS[0]}
}

# 1. Clean up any broken rebase/merge state
git rebase --abort 2>/dev/null || true
git merge --abort  2>/dev/null || true

# 2. Ensure we are on main branch
CURRENT=$(git symbolic-ref --short HEAD 2>/dev/null || echo "detached")
if [ "$CURRENT" != "main" ]; then
  echo "Switching to main branch..."
  git checkout -B main 2>/dev/null || true
fi

# 3. Stage all changes
git add -A

# 4. Commit if anything is new
if git diff --cached --quiet; then
  echo "✓ Nothing new to commit."
else
  git -c user.email="build@focusflow.app" -c user.name="FocusFlow Build" \
    commit -m "chore: sync latest changes from Replit [$(date -u '+%Y-%m-%d %H:%M UTC')]"
  echo "✓ Committed."
fi

# 5. Fetch remote
echo "Syncing with remote..."
GIT_TERMINAL_PROMPT=0 git fetch "$REMOTE_URL" main:refs/remotes/origin/main 2>&1 | grep -v "ghp_" | grep -v "github_pat_" || true

# 6. Try fast-forward rebase
REMOTE_SHA=$(git rev-parse refs/remotes/origin/main 2>/dev/null || echo "")
if [ -n "$REMOTE_SHA" ]; then
  git rebase refs/remotes/origin/main 2>/dev/null || {
    echo "Rebase conflict detected — will force-push."
    git rebase --abort 2>/dev/null || true
  }
fi

# 7. Push attempts — use PIPESTATUS[0] for real git exit code
echo "Pushing to GitHub..."

# Attempt 1: normal push
GIT_TERMINAL_PROMPT=0 git push "$REMOTE_URL" HEAD:main 2>&1 | grep -v "ghp_" | grep -v "github_pat_" || true
PUSH_EC=${PIPESTATUS[0]}

if [ "$PUSH_EC" -eq 0 ]; then
  echo ""
  echo "✓ Pushed! GitHub Actions will now build the .exe."
  exit 0
fi

# Attempt 2: fetch + rebase + push
echo "Normal push rejected — re-fetching and retrying..."
GIT_TERMINAL_PROMPT=0 git fetch "$REMOTE_URL" main:refs/remotes/origin/main 2>&1 | grep -v "ghp_" | grep -v "github_pat_" || true
git rebase refs/remotes/origin/main 2>/dev/null || git rebase --abort 2>/dev/null || true

GIT_TERMINAL_PROMPT=0 git push "$REMOTE_URL" HEAD:main 2>&1 | grep -v "ghp_" | grep -v "github_pat_" || true
PUSH_EC=${PIPESTATUS[0]}

if [ "$PUSH_EC" -eq 0 ]; then
  echo ""
  echo "✓ Pushed after rebase! GitHub Actions will now build the .exe."
  exit 0
fi

# Attempt 3: force push (Replit is source of truth)
echo "Retry also rejected — force-pushing..."
GIT_TERMINAL_PROMPT=0 git push --force "$REMOTE_URL" HEAD:main 2>&1 | grep -v "ghp_" | grep -v "github_pat_" || true
PUSH_EC=${PIPESTATUS[0]}

if [ "$PUSH_EC" -eq 0 ]; then
  echo ""
  echo "✓ Force-pushed! GitHub Actions will now build the .exe."
  exit 0
fi

echo "✗ Push failed — check token and repo access."
exit 1
