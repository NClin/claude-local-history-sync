#!/bin/bash
# Real-time bidirectional sync between global and local .claude/history

set -e

# Get the project root (current working directory)
PROJECT_ROOT="$(pwd)"
LOCAL_HISTORY="$PROJECT_ROOT/.claude/history"
GLOBAL_PROJECTS_DIR="$HOME/.claude/projects"

# Find the global storage path for this project
PROJECT_NAME=$(echo "$PROJECT_ROOT" | sed 's/\//-/g' | sed 's/^-//')
GLOBAL_HISTORY="$GLOBAL_PROJECTS_DIR/-$PROJECT_NAME"

# Check if sync is enabled
SYNC_CONFIG="$PROJECT_ROOT/.claude/.sync-enabled"
if [ ! -f "$SYNC_CONFIG" ]; then
  # Default to enabled, create marker
  echo "enabled" > "$SYNC_CONFIG"
fi

SYNC_ENABLED=$(cat "$SYNC_CONFIG")
if [ "$SYNC_ENABLED" != "enabled" ]; then
  exit 0  # Silently skip if disabled
fi

# Create directories if they don't exist
mkdir -p "$LOCAL_HISTORY"
mkdir -p "$GLOBAL_HISTORY"

# Ensure .claude/history/ is in .gitignore
GITIGNORE="$PROJECT_ROOT/.gitignore"
if [ -f "$GITIGNORE" ]; then
  if ! grep -q "^/.claude/history/" "$GITIGNORE" 2>/dev/null; then
    echo "" >> "$GITIGNORE"
    echo "# Claude Code conversation history (added by claude-sync)" >> "$GITIGNORE"
    echo "/.claude/history/" >> "$GITIGNORE"
  fi
else
  echo "# Claude Code conversation history (added by claude-sync)" > "$GITIGNORE"
  echo "/.claude/history/" >> "$GITIGNORE"
fi

# Sync: copy newer files in both directions
rsync -au --ignore-existing "$GLOBAL_HISTORY/"*.jsonl "$LOCAL_HISTORY/" 2>/dev/null || true
rsync -au "$LOCAL_HISTORY/"*.jsonl "$GLOBAL_HISTORY/" 2>/dev/null || true

exit 0
