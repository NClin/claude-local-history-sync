---
name: sync-status
description: Show conversation sync status
---

```bash
#!/bin/bash
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
echo "Use '/sync toggle' to enable/disable"
```
