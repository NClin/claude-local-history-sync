# Claude Sync

**Keep your Claude Code conversations with your project** - Automatically sync conversation history to `.claude` folders, just like `.git`!

## The Problem

Claude Code stores all conversation history globally in `~/.claude/projects/`. When you move a project (via git clone, cloud storage, etc.), you lose all your conversation history.

## The Solution

`claude-sync` automatically keeps your conversations synced between the global storage and your project's `.claude` folder. Clone your project on a new machine? Your conversations come with it!

## Installation

```bash
npm install -g claude-sync
```

## Quick Start

**One command to get started:**

```bash
claude-sync enable
```

That's it! Your conversations now automatically sync between:
- Global storage (`~/.claude/projects/`)
- Local storage (`.claude/history/` in each project)

## Usage

### Auto-Sync Commands

```bash
# Enable automatic syncing (run once)
claude-sync enable

# Disable automatic syncing
claude-sync disable

# Check status
claude-sync status
```

### Git Commands

By default, conversations are **not** in `.gitignore`. You can decide whether to commit them.

```bash
# Prevent committing conversations (adds to .gitignore)
claude-sync gitenable

# Allow committing conversations (removes from .gitignore)
claude-sync gitdisable
```

## How It Works

1. **Enable once**: `claude-sync enable` starts a background daemon
2. **Automatic discovery**: Finds all projects with `.claude` folders
3. **Bidirectional sync**: Conversations sync both ways automatically
4. **Portable**: Clone your project anywhere, conversations come with it

### What Gets Synced?

- All conversation files (`.jsonl`) for your project
- Syncs continuously in the background
- No manual sync needed!

### Monitoring

By default, `claude-sync` monitors:
- `~/Projects`
- `~/code`
- `~/src`

Custom paths:
```bash
claude-sync enable --paths ~/work ~/personal/projects
```

## Common Workflows

### New Project Setup

```bash
cd my-project
claude  # Use Claude Code as normal
# Conversations automatically sync!
```

### Sharing Conversations with Your Team

```bash
# Allow committing (if needed)
claude-sync gitdisable

# Commit and push
git add .claude/
git commit -m "Add conversation history"
git push

# Team members with claude-sync enabled get conversations automatically!
```

### Moving to a New Machine

```bash
# On new machine, install and enable
npm install -g claude-sync
claude-sync enable

# Clone your project
git clone https://github.com/you/project.git
cd project

# Conversations are automatically available in Claude Code!
```

### Keeping Conversations Private

```bash
# Prevent committing to git
claude-sync gitenable

# Conversations stay synced locally but won't be committed
```

## Project Structure

After using Claude Code in a project:

```
your-project/
├── .claude/
│   ├── history/          # Conversation history files
│   │   ├── abc123.jsonl
│   │   └── def456.jsonl
│   └── README.md         # Auto-generated documentation
├── .gitignore            # (optional) Use gitenable to add .claude entries
└── ...
```

## Configuration

Configuration is minimal. The daemon stores:

- **PID file**: `~/.claude-sync-daemon.pid`
- **Config**: `~/.claude-sync-config.json`

No configuration files needed in projects!

## Commands Reference

### `claude-sync enable`

Start automatic syncing. Monitors specified directories for projects with `.claude` folders.

**Options:**
- `--paths <paths...>` - Custom directories to monitor (default: ~/Projects, ~/code, ~/src)

**Example:**
```bash
claude-sync enable
claude-sync enable --paths ~/work ~/repos
```

### `claude-sync disable`

Stop automatic syncing and clean up background daemon.

### `claude-sync status`

Show current sync status and project information.

### `claude-sync gitenable`

Add `.claude/history/` to `.gitignore` to prevent committing conversations.

**Note:** Only works in git repositories.

### `claude-sync gitdisable`

Remove `.claude/history/` from `.gitignore` to allow committing conversations.

**Note:** Only works in git repositories.

## FAQ

**Q: Do I need to run a command in each project?**
A: No! Just run `claude-sync enable` once. All projects are automatically discovered and synced.

**Q: What happens if I disable sync?**
A: Conversations stay in place, but stop syncing. Re-enable anytime with `claude-sync enable`.

**Q: Should I commit conversations to git?**
A: Your choice! Use `gitenable` to prevent committing (private), or `gitdisable` to allow committing (shared with team).

**Q: Can I use this on multiple machines?**
A: Yes! Install and enable on each machine. When you clone a project, conversations sync automatically.

**Q: Will this work with future Claude Code versions?**
A: We'll update as needed if Claude Code's storage format changes.

**Q: Does this modify Claude Code?**
A: No, it's a separate tool that works alongside Claude Code by managing conversation files.

**Q: What about privacy/security?**
A: All data stays on your machine. No uploads, no external services.

## Troubleshooting

### Daemon won't start

```bash
# Check if already running
claude-sync status

# If stale, manually clean up
rm ~/.claude-sync-daemon.pid
claude-sync enable
```

### Conversations not syncing

```bash
# Check status
claude-sync status

# Restart daemon
claude-sync disable
claude-sync enable
```

### Permission errors

Ensure you have read/write access to:
- `~/.claude/` (global storage)
- `.claude/` in your projects

## Development

```bash
# Clone the repository
git clone https://github.com/NClin/claude-local-history-sync.git
cd claude-local-history-sync

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Link locally for testing
npm link
```

## Contributing

Contributions welcome! Please submit a Pull Request.

## License

MIT

## Support

- Report bugs: [GitHub Issues](https://github.com/NClin/claude-local-history-sync/issues)
- Discussions: [GitHub Discussions](https://github.com/NClin/claude-local-history-sync/discussions)
- Pull Requests: [GitHub PRs](https://github.com/NClin/claude-local-history-sync/pulls)

---

Made with ❤️ for the Claude Code community
