# Claude Local Storage - Workflow Guide

## The Problem It Solves

When you move a Claude Code project folder, you lose all conversation history because Claude Code stores conversations globally. This tool keeps conversations with your project in a `.claude` folder (like `.git`).

## How It Works

```
┌─────────────────────┐         ┌─────────────────────┐
│  Global Storage     │         │  Local Storage      │
│  (Claude Code)      │  sync   │  (.claude/history)  │
│                     │◄────────┤                     │
│  ~/Library/...      │────────►│  project/.claude/   │
│                     │         │                     │
└─────────────────────┘         └─────────────────────┘
```

## Quick Reference

### Initial Setup (Once per project)

```bash
cd your-project
claude-local init           # Creates .claude folder
claude-local sync          # Import existing conversations
```

### Daily Work

```bash
# Option 1: Auto-sync (recommended)
claude-local watch &       # Run in background

# Option 2: Manual sync
claude-local sync          # After working with Claude Code
```

### Moving Projects

**Scenario: You cloned a project or moved it to a new machine**

```bash
cd your-project
claude-local sync --to-global    # Restore conversations
claude                           # Use Claude Code
# Now /resume works with your history!
```

## Common Commands

| Command | What It Does |
|---------|--------------|
| `claude-local init` | Set up `.claude` folder in current project |
| `claude-local sync` | Import conversations FROM global TO local |
| `claude-local sync --to-global` | Export conversations FROM local TO global |
| `claude-local sync --bidirectional` | Sync both ways |
| `claude-local watch` | Auto-sync on file changes |
| `claude-local status` | Show current state |

## Typical Workflows

### Workflow 1: Start a New Project

```bash
cd ~/projects/my-new-project
claude-local init
claude-local watch &    # Auto-sync in background
claude                  # Use Claude Code normally
```

### Workflow 2: Clone Existing Project with History

```bash
git clone https://github.com/you/project.git
cd project
ls .claude/history/     # Conversations are here!
claude-local sync --to-global
claude                  # Now you can /resume conversations
```

### Workflow 3: Share Project with Team

```bash
# Developer A:
cd project
claude-local sync       # Pull latest
git add .claude/
git commit -m "Update conversation history"
git push

# Developer B:
git pull
claude-local sync --to-global
claude                  # Access shared conversations
```

### Workflow 4: Moving to New Machine

```bash
# Old machine:
cd project
claude-local sync       # Ensure everything is saved locally
# (sync to cloud/git/drive)

# New machine:
# (restore from cloud/git/drive)
cd project
claude-local sync --to-global
claude                  # All conversations available!
```

## Understanding Sync Directions

### `claude-local sync` (default: --from-global)
- **Direction**: Global → Local
- **When**: After working in Claude Code
- **Result**: Local `.claude` gets updated
- **Use Case**: Backing up conversations locally

### `claude-local sync --to-global`
- **Direction**: Local → Global
- **When**: After moving/cloning project
- **Result**: Global storage gets updated
- **Use Case**: Making local conversations available in Claude Code

### `claude-local sync --bidirectional`
- **Direction**: Both ways
- **When**: Maintaining sync between machines
- **Result**: Both locations have latest versions
- **Use Case**: Working on multiple machines

## Best Practices

### 1. Always Init New Projects
```bash
claude-local init
```

### 2. Use Watch for Active Development
```bash
claude-local watch &
```

### 3. Sync Before Committing
```bash
claude-local sync
git add .claude/
git commit -m "Backup conversations"
```

### 4. Restore After Cloning
```bash
claude-local sync --to-global
```

### 5. Check Status When Unsure
```bash
claude-local status
```

## Git Integration

### Recommended .gitignore

The tool automatically adds:
```gitignore
/.claude/history/
/.claude/*.log
/.claude/cache/
```

### What to Commit

**Do commit:**
- `.claude/` directory structure
- `.claude/README.md`
- `.claude/config.json` (if you have project-specific settings)

**Don't commit:**
- `.claude/history/` (contains actual conversations)
- `.claude/*.log` (log files)

**Why?** Conversations may contain sensitive info. Only commit if you explicitly want to share history with your team.

## Troubleshooting

### Conversations not showing in Claude Code?

```bash
# Make sure you've restored them:
claude-local sync --to-global
```

### Local storage not found?

```bash
# Initialize it first:
claude-local init
```

### Want to see what's happening?

```bash
# Check current state:
claude-local status

# See detailed info:
ls -la .claude/history/
```

### Sync conflicts?

The tool uses timestamp-based copying (newer wins). If you have conflicts:

```bash
# Force sync from local to global:
claude-local sync --to-global

# Or force sync from global to local:
claude-local sync --from-global
```

## Advanced Usage

### Custom Global Path

```bash
claude-local config set-global-path /custom/path
```

### Storage Modes

```bash
# Local only (default)
claude-local config set-mode local

# Global only (disable local storage)
claude-local config set-mode global

# Hybrid (sync both automatically)
claude-local config set-mode hybrid
```

### Watch with Bidirectional Sync

```bash
claude-local watch --bidirectional
```

## FAQs

**Q: Will this work if Claude Code updates?**
A: Yes, it just copies files. As long as Claude Code uses the same storage format, it'll work.

**Q: Can I use this on multiple machines?**
A: Yes! Use `sync --to-global` after moving/cloning to restore conversations.

**Q: Does it slow down Claude Code?**
A: No, it only copies files. Claude Code doesn't know about it.

**Q: What if I don't want to sync everything?**
A: The tool filters conversations by project. Only relevant conversations are synced.

**Q: Can I selectively sync conversations?**
A: Not yet, but you can manually manage files in `.claude/history/`.

## Summary

**Key Concept:** Conversations live in TWO places:
1. **Global** (`~/Library/Application Support/Claude Code/history/`) - where Claude Code looks
2. **Local** (`project/.claude/history/`) - portable with your project

**The Tool's Job:** Keep these in sync so you never lose conversations when moving projects.

**Golden Rule:**
- Moving TO new location? → `sync --to-global` first
- Working normally? → `sync` (or `watch`) to backup

---

For more details, see the [full README](./README.md).
