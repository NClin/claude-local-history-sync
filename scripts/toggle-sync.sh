#!/bin/bash
# Toggle sync on/off

set -e

PROJECT_ROOT="$(pwd)"
SYNC_CONFIG="$PROJECT_ROOT/.claude/.sync-enabled"

# Create .claude directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/.claude"

# Check current state
if [ -f "$SYNC_CONFIG" ]; then
  CURRENT=$(cat "$SYNC_CONFIG")
else
  CURRENT="enabled"
fi

# Toggle
if [ "$CURRENT" = "enabled" ]; then
  echo "disabled" > "$SYNC_CONFIG"
  echo "🔕 Claude Sync disabled for this project"
  echo "Run '/sync toggle' again to re-enable"
else
  echo "enabled" > "$SYNC_CONFIG"
  echo "✓ Claude Sync enabled for this project"
  echo "Conversations will sync automatically"
fi

exit 0
