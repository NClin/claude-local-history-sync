---
name: sync-init
description: Initialize local conversation history storage in the current project
---

Initialize local conversation history storage for this project by creating a `.claude/history/` directory and setting up automatic gitignore rules.

Run the claude-sync init command:

```bash
npx claude-sync init
```

This will:
- Create `.claude/history/` directory for storing conversations
- Add appropriate entries to `.gitignore` to keep history private
- Set up the project for automatic conversation syncing

Once initialized, you can:
- Use `/sync status` to check sync status
- Use `/sync watch` to start automatic syncing
- Use `/sync daemon start` to enable background syncing across all projects
