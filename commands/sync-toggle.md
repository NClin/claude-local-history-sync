---
name: sync-toggle
description: Toggle automatic sync on/off
---

```bash
#!/bin/bash
PROJECT_ROOT="$(pwd)"
SYNC_CONFIG="$PROJECT_ROOT/.claude/.sync-enabled"

mkdir -p "$PROJECT_ROOT/.claude"

if [ -f "$SYNC_CONFIG" ]; then
  CURRENT=$(cat "$SYNC_CONFIG")
else
  CURRENT="enabled"
fi

if [ "$CURRENT" = "enabled" ]; then
  echo "disabled" > "$SYNC_CONFIG"
  echo "🔕 Claude Sync disabled"
  echo "Run '/sync toggle' to re-enable"
else
  echo "enabled" > "$SYNC_CONFIG"
  echo "✓ Claude Sync enabled"
  echo "Conversations will sync automatically"
fi
```
