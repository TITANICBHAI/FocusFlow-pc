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

# Push and capture git's real exit code BEFORE || true can stomp PIPESTATUS
do_push() {
  # Run git push, filter token from output; save PIPESTATUS[0] immediately
  GIT_TERMINAL_PROMPT=0 git push "$@" "$REMOTE_URL" HEAD:main 2>&1 \
    | grep -v "ghp_" | grep -v "github_pat_"
  # PIPESTATUS[0] = git exit code, before any || or && can overwrite it
  echo "__GITEC__${PIPESTATUS[0]}"
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
GIT_TERMINAL_PROMPT=0 git fetch "$REMOTE_URL" main:refs/remotes/origin/main 2>&1 \
  | grep -v "ghp_" | grep -v "github_pat_" || true

# 6. Try rebase (safe no-op if up to date, aborts on conflict)
REMOTE_SHA=$(git rev-parse refs/remotes/origin/main 2>/dev/null || echo "")
if [ -n "$REMOTE_SHA" ]; then
  git rebase refs/remotes/origin/main 2>/dev/null || {
    echo "Rebase conflict — will force-push."
    git rebase --abort 2>/dev/null || true
  }
fi

# ── Attempt 1: normal push ────────────────────────────────────────────────────
echo "Pushing to GitHub..."
OUT=$(do_push)
echo "$OUT" | grep -v "__GITEC__"
PUSH_EC=$(echo "$OUT" | grep "__GITEC__" | sed 's/__GITEC__//')

if [ "$PUSH_EC" = "0" ]; then
  echo ""
  echo "✓ Pushed! GitHub Actions will now build the .exe."
  exit 0
fi

# ── Attempt 2: re-fetch + rebase + push ──────────────────────────────────────
echo "Normal push rejected (git exit $PUSH_EC) — re-fetching and retrying..."
GIT_TERMINAL_PROMPT=0 git fetch "$REMOTE_URL" main:refs/remotes/origin/main 2>&1 \
  | grep -v "ghp_" | grep -v "github_pat_" || true
git rebase refs/remotes/origin/main 2>/dev/null || git rebase --abort 2>/dev/null || true

OUT=$(do_push)
echo "$OUT" | grep -v "__GITEC__"
PUSH_EC=$(echo "$OUT" | grep "__GITEC__" | sed 's/__GITEC__//')

if [ "$PUSH_EC" = "0" ]; then
  echo ""
  echo "✓ Pushed after rebase! GitHub Actions will now build the .exe."
  exit 0
fi

# ── Attempt 3: force push (Replit is source of truth) ────────────────────────
echo "Retry rejected (git exit $PUSH_EC) — force-pushing..."
OUT=$(do_push --force)
echo "$OUT" | grep -v "__GITEC__"
PUSH_EC=$(echo "$OUT" | grep "__GITEC__" | sed 's/__GITEC__//')

if [ "$PUSH_EC" = "0" ]; then
  echo ""
  echo "✓ Force-pushed! GitHub Actions will now build the .exe."
  exit 0
fi

echo "✗ All push attempts failed (git exit $PUSH_EC). Check token and repo access."
exit 1
