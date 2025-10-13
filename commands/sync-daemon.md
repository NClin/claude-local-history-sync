---
name: sync-daemon
description: Manage the background sync daemon for automatic conversation syncing
---

Manage the background daemon that automatically discovers and syncs conversation history across all your Claude Code projects.

## Start the daemon

```bash
npx claude-sync daemon start
```

This starts a background process that:
- Auto-discovers all projects with `.claude` folders
- Watches for file changes in both local and global storage
- Bidirectionally syncs conversations in real-time
- Makes conversations instantly available in Claude Code
- Runs transparently in the background

## Check daemon status

```bash
npx claude-sync daemon status
```

Shows:
- Whether daemon is running
- Number of projects being monitored
- List of monitored project paths

## Stop the daemon

```bash
npx claude-sync daemon stop
```

## Custom search paths

By default, the daemon monitors `~/Projects`, `~/code`, and `~/src`. To specify custom paths:

```bash
npx claude-sync daemon start --paths ~/work ~/personal/projects
```

**Recommended:** Start the daemon once and let it run in the background. It will automatically handle all your projects!
