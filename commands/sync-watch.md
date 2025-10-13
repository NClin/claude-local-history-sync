---
name: sync-watch
description: Start watching for conversation changes and auto-sync
---

Start watching for conversation changes and automatically sync between local and global storage.

Run the claude-sync watch command:

```bash
npx claude-sync watch --bidirectional
```

The watcher will:
- Monitor global storage for new conversations
- Monitor local storage for changes
- Automatically sync conversations in both directions
- Run in the foreground (press Ctrl+C to stop)

Options:
- `--bidirectional`: Sync in both directions (recommended)
- Default behavior syncs from global to local only

For automatic background syncing across all projects, use `/sync daemon start` instead.
