#!/bin/bash

# Vercel Ignore Build Script
# This script tells Vercel when NOT to build and deploy
# Returns exit code 0 to proceed with build, 1 to cancel build

echo "🔍 Checking if build should proceed..."

# Get the list of changed files
if [ -z "$VERCEL_GIT_COMMIT_REF" ]; then
  echo "⚠️  Not in Vercel environment, proceeding with build"
  exit 0
fi

# Get files changed in the last commit
FILES_CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null)

if [ -z "$FILES_CHANGED" ]; then
  echo "⚠️  Could not determine changed files, proceeding with build"
  exit 0
fi

echo "📝 Files changed:"
echo "$FILES_CHANGED"

# Check if any non-documentation files were changed
NON_DOC_FILES=$(echo "$FILES_CHANGED" | grep -v -E '\.(md|txt)$|^\.github/|^\.vscode/|LICENSE$' || true)

if [ -z "$NON_DOC_FILES" ]; then
  echo "✅ Only documentation files changed, skipping build"
  echo "Changed files:"
  echo "$FILES_CHANGED"
  exit 1
else
  echo "🚀 Code changes detected, proceeding with build"
  echo "Non-documentation files changed:"
  echo "$NON_DOC_FILES"
  exit 0
fi

