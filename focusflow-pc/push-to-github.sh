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

# Pull any remote-only commits first so we stay in sync
echo "Pulling latest from remote..."
GIT_TERMINAL_PROMPT=0 git pull "$REMOTE_URL" main --rebase --no-edit 2>&1 | grep -v "ghp_"
echo ""

# Stage all changes
git add -A

# Commit if there's anything staged
if git diff --cached --quiet; then
  echo "✓ Nothing new to commit — repo is already up to date."
else
  git -c user.email="build@focusflow.app" -c user.name="FocusFlow Build" \
    commit -m "chore: sync latest changes from Replit [$(date -u '+%Y-%m-%d %H:%M UTC')]"
  echo "✓ Committed."
fi

# Push
echo "Pushing to GitHub..."
GIT_TERMINAL_PROMPT=0 git push "$REMOTE_URL" HEAD:main \
  && echo "" && echo "✓ Pushed! GitHub Actions will now build the .exe." \
  || echo "✗ Push failed — check token and repo access."
