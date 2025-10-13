---
name: sync-status
description: Show conversation sync status for the current project
---

Check the status of conversation history syncing for this project.

Run the claude-sync status command:

```bash
npx claude-sync status
```

This displays:
- Number of conversations in local storage
- Number of conversations in global storage
- Last sync time
- Current sync mode (local, global, or hybrid)
- Daemon status (if running)

Use this command to verify that your conversations are being properly synced between local and global storage.
