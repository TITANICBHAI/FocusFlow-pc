#!/bin/bash
set -e

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  echo "ERROR: GITHUB_PERSONAL_ACCESS_TOKEN is not set"
  exit 1
fi

REPO_URL="https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/TITANICBHAI/FocusFlow-pc.git"

git config user.email "focusflow-bot@replit.dev"
git config user.name "FocusFlow Bot"

git add -A

if git diff --cached --quiet; then
  echo "Nothing new to commit — pushing existing HEAD..."
else
  git commit -m "fix: native module packaging, build reliability, error handling"
fi

git push "$REPO_URL" HEAD:main

echo ""
echo "Pushed successfully."
echo "Watch the build at: https://github.com/TITANICBHAI/FocusFlow-pc/actions"
