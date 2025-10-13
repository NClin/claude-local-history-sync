---
name: sync-help
description: Show help and documentation for claude-sync
---

# Claude Sync - Portable Conversation History

Keep your Claude Code conversation history with your project in a `.claude` folder, just like `.git`!

## Quick Start

1. **Initialize** - Set up local storage in your project:
   ```bash
   /sync init
   ```

2. **Start Daemon** - Enable automatic syncing across all projects:
   ```bash
   /sync daemon start
   ```

That's it! Your conversations are now synced locally and will move with your project.

## Available Commands

- `/sync init` - Initialize local storage in current project
- `/sync status` - Check sync status and conversation count
- `/sync watch` - Start watching for changes (foreground)
- `/sync daemon start` - Start background daemon (recommended)
- `/sync daemon status` - Check daemon status
- `/sync daemon stop` - Stop background daemon
- `/sync help` - Show this help message

## Common Workflows

### Moving a Project
When you clone or move a project, conversations move with it. To make them available in Claude Code:
```bash
npx claude-sync sync --to-global
```

### Backing Up
```bash
npx claude-sync sync
git add .claude/
git commit -m "Backup conversation history"
```

## Configuration

```bash
# Set storage mode (local, global, or hybrid)
npx claude-sync config set-mode hybrid

# Show current config
npx claude-sync config show
```

## Learn More

- GitHub: https://github.com/NClin/claude-local-history-sync
- NPM: https://www.npmjs.com/package/claude-sync
- Full Documentation: See README.md in repository

## Need Help?

Report issues: https://github.com/NClin/claude-local-history-sync/issues
