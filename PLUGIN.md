# Claude Sync Plugin

A Claude Code plugin for syncing conversation history locally within your projects.

## Installation

### From Marketplace

```bash
/plugin marketplace add NClin/claude-local-history-sync
/plugin install claude-sync
```

### Manual Installation

If you prefer to install manually:

```bash
npm install -g claude-sync
```

## Features

### Slash Commands

Once installed, you'll have access to these slash commands:

- `/sync init` - Initialize local storage in current project
- `/sync status` - Check sync status and conversation count
- `/sync watch` - Start watching for changes
- `/sync daemon start` - Start background daemon for automatic syncing
- `/sync daemon status` - Check daemon status
- `/sync daemon stop` - Stop background daemon
- `/sync help` - Show detailed help

### Hooks

The plugin includes optional hooks:

1. **check-sync-status** (enabled by default)
   - Shows a notification when you enter a project with `.claude/history`
   - Reminds you to check sync status

2. **auto-sync-on-start** (disabled by default)
   - Automatically syncs conversations to global storage when starting
   - Enable in your settings if you want automatic syncing

## Quick Start

1. **Install the plugin:**
   ```bash
   /plugin install claude-sync
   ```

2. **Initialize in your project:**
   ```bash
   /sync init
   ```

3. **Start the daemon for automatic syncing:**
   ```bash
   /sync daemon start
   ```

That's it! Your conversations will now sync automatically across all your projects.

## How It Works

Claude Sync stores conversation history in `.claude/history/` within each project, similar to how Git stores repository data in `.git/`. This makes your conversation history:

- **Portable** - Moves with your project when you clone or copy it
- **Project-specific** - Each project maintains its own conversation history
- **Git-friendly** - Automatically added to `.gitignore` (optional to commit)
- **Synchronized** - Keeps local and global storage in sync

## Common Workflows

### Moving a Project

When you clone a project with `.claude/history/`:

```bash
cd cloned-project
/sync status              # Check what conversations are available
/sync daemon start        # Start daemon (if not already running)
```

The daemon will automatically sync conversations to global storage, making them available via `/resume`.

### Backing Up Conversations

```bash
/sync init                # Initialize if needed
/sync status              # Verify conversations are synced
git add .claude/
git commit -m "Backup conversation history"
git push
```

### Sharing with Team

The plugin makes it easy for teams to share conversation history:

```bash
# Team member 1
/sync init
# Work on project, have conversations
git add .claude/ && git commit -m "Add conversation history"
git push

# Team member 2
git pull
/sync daemon start        # Conversations automatically available
```

## Configuration

### Storage Modes

```bash
# Local mode (default) - conversations only in project folder
npx claude-sync config set-mode local

# Global mode - conversations only in global storage
npx claude-sync config set-mode global

# Hybrid mode - conversations in both locations
npx claude-sync config set-mode hybrid
```

### Daemon Search Paths

By default, the daemon monitors `~/Projects`, `~/code`, and `~/src`. To customize:

```bash
/sync daemon start --paths ~/work ~/personal/projects
```

## Troubleshooting

### Conversations not syncing

1. Check daemon status: `/sync daemon status`
2. Check sync status: `/sync status`
3. Try manual sync: `npx claude-sync sync --bidirectional`

### Plugin not loading

1. Verify installation: `/plugin list`
2. Check plugin is enabled in settings
3. Restart Claude Code

### Permission errors

Ensure you have read/write access to:
- Global storage: `~/.claude/projects/`
- Local storage: `.claude/history/`

## Advanced Usage

### Programmatic Access

You can also use claude-sync as a library in your own scripts:

```typescript
import { StorageManager, ConfigManager } from 'claude-sync';

const storage = new StorageManager();
await storage.initializeLocalStorage('/path/to/project');
await storage.syncToLocal('/path/to/project', { bidirectional: true });
```

### Custom Hooks

You can create your own hooks using claude-sync. For example, auto-sync before git commits:

```json
{
  "hooks": [
    {
      "name": "pre-commit-sync",
      "type": "command",
      "command": "npx claude-sync sync --dry-run"
    }
  ]
}
```

## Learn More

- **GitHub:** https://github.com/NClin/claude-local-history-sync
- **NPM Package:** https://www.npmjs.com/package/claude-sync
- **Full Documentation:** See main README.md
- **Report Issues:** https://github.com/NClin/claude-local-history-sync/issues

## Support

- Report bugs via [GitHub Issues](https://github.com/NClin/claude-local-history-sync/issues)
- Ask questions in [Discussions](https://github.com/NClin/claude-local-history-sync/discussions)
- Contribute via [Pull Requests](https://github.com/NClin/claude-local-history-sync/pulls)

## License

MIT License - see LICENSE file for details

---

Made with by developers who move their projects around a lot.
