#!/bin/bash
# Show sync status

set -e

PROJECT_ROOT="$(pwd)"
LOCAL_HISTORY="$PROJECT_ROOT/.claude/history"
GLOBAL_PROJECTS_DIR="$HOME/.claude/projects"
PROJECT_NAME=$(echo "$PROJECT_ROOT" | sed 's/\//-/g' | sed 's/^-//')
GLOBAL_HISTORY="$GLOBAL_PROJECTS_DIR/-$PROJECT_NAME"
SYNC_CONFIG="$PROJECT_ROOT/.claude/.sync-enabled"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Claude Sync Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if sync is enabled
if [ -f "$SYNC_CONFIG" ]; then
  STATUS=$(cat "$SYNC_CONFIG")
else
  STATUS="enabled"
fi

if [ "$STATUS" = "enabled" ]; then
  echo "Status: ✓ ENABLED"
else
  echo "Status: 🔕 DISABLED"
fi

echo ""
echo "Project: $PROJECT_ROOT"
echo ""

# Count conversations
LOCAL_COUNT=0
GLOBAL_COUNT=0

if [ -d "$LOCAL_HISTORY" ]; then
  LOCAL_COUNT=$(ls -1 "$LOCAL_HISTORY"/*.jsonl 2>/dev/null | wc -l | tr -d ' ')
fi

if [ -d "$GLOBAL_HISTORY" ]; then
  GLOBAL_COUNT=$(ls -1 "$GLOBAL_HISTORY"/*.jsonl 2>/dev/null | wc -l | tr -d ' ')
fi

echo "Conversations:"
echo "  Local:  $LOCAL_COUNT (.claude/history/)"
echo "  Global: $GLOBAL_COUNT (~/.claude/projects/)"
echo ""

# Check gitignore status
GITIGNORE="$PROJECT_ROOT/.gitignore"
if [ -f "$GITIGNORE" ] && grep -q "^/.claude/history/" "$GITIGNORE" 2>/dev/null; then
  echo "Git: .claude/history/ is ignored ✓"
else
  echo "Git: .claude/history/ is NOT ignored (will be added on next sync)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Use '/sync toggle' to enable/disable sync"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0
