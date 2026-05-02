#!/bin/bash
# FocusFlow PC — GitHub Push Script
# Configured as a Replit workflow — restart to push latest changes.

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

# 1. Clean up any broken rebase/merge state
git rebase --abort 2>/dev/null || true
git merge --abort 2>/dev/null || true

# 2. Ensure we are on main branch (detached HEAD after rebase leaves mess)
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

# 5. Fetch remote to check divergence
echo "Syncing with remote..."
GIT_TERMINAL_PROMPT=0 git fetch "$REMOTE_URL" main:refs/remotes/origin/main 2>&1 | grep -v "ghp_" || true

# 6. Rebase our commits on top of remote (safe if not diverged, no-op if up-to-date)
REMOTE_SHA=$(git rev-parse refs/remotes/origin/main 2>/dev/null || echo "")
if [ -n "$REMOTE_SHA" ]; then
  git rebase refs/remotes/origin/main 2>/dev/null || {
    echo "Rebase conflict detected — aborting rebase and will force-push."
    git rebase --abort 2>/dev/null || true
  }
fi

# 7. Push — fall back to force push if history diverged
echo "Pushing to GitHub..."
GIT_TERMINAL_PROMPT=0 git push "$REMOTE_URL" HEAD:main 2>&1 | grep -v "ghp_" \
  && echo "" && echo "✓ Pushed! GitHub Actions will now build the .exe." \
  || {
    echo "Normal push rejected — rebasing and retrying..."
    # Re-fetch and try one more time
    GIT_TERMINAL_PROMPT=0 git fetch "$REMOTE_URL" main:refs/remotes/origin/main 2>&1 | grep -v "ghp_" || true
    git rebase refs/remotes/origin/main 2>/dev/null || git rebase --abort 2>/dev/null || true
    GIT_TERMINAL_PROMPT=0 git push "$REMOTE_URL" HEAD:main 2>&1 | grep -v "ghp_" \
      && echo "" && echo "✓ Pushed after rebase! GitHub Actions will now build the .exe." \
      || {
        echo "Retried push also failed — using force push (Replit is source of truth)..."
        GIT_TERMINAL_PROMPT=0 git push --force "$REMOTE_URL" HEAD:main 2>&1 | grep -v "ghp_" \
          && echo "" && echo "✓ Force-pushed! GitHub Actions will now build the .exe." \
          || echo "✗ Push failed — check token and repo access."
      }
  }
