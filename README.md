# Claude Local Storage

**Local conversation history storage for Claude Code** - Keep your Claude Code conversation history with your project in a `.claude` folder, just like `.git`!

## Problem

Currently, Claude Code stores all conversation history globally. When you move a project folder to a different location or machine, you lose all your conversation history for that project. This tool solves that problem by storing conversation history locally within each project.

## Features

- **Project-Local Storage**: Store conversation history in `.claude/history/` within your project
- **Automatic Sync**: Sync conversations between global and local storage
- **File Watching**: Auto-sync conversations as they're created or modified
- **Git Integration**: Automatic `.gitignore` management to exclude history from version control
- **Multiple Modes**: Global, local, or hybrid storage modes
- **Zero Config**: Works out of the box with sensible defaults
- **TypeScript**: Fully typed for great DX

## Installation

```bash
npm install -g claude-local-storage
```

Or use with `npx`:

```bash
npx claude-local-storage init
```

## Quick Start

### 1. Initialize Local Storage

Navigate to your project and initialize local storage:

```bash
cd /path/to/your/project
claude-local init
```

This will:
- Create `.claude/history/` directory
- Add recommended entries to `.gitignore`
- Create a README explaining the structure

### 2. Sync Existing Conversations

Import conversations from global storage:

```bash
claude-local sync
```

### 3. Auto-Sync (Optional)

Watch for changes and automatically sync:

```bash
claude-local watch
```

## Common Workflows

### Moving a Project to a New Machine/Location

When you move your project (via git clone, cloud storage, etc.), the conversation history moves with it in the `.claude` folder. To make these conversations available in Claude Code:

```bash
# Navigate to your project
cd /path/to/your/project

# Restore conversations to global storage
claude-local sync --to-global

# Now use Claude Code as normal
claude

# Use /resume to access your conversations
```

**What happens:**
1. Your local `.claude/history/` contains all the conversations
2. `sync --to-global` copies them to Claude Code's global storage
3. `/resume` in Claude Code now shows your project's conversations

### Backing Up Before Moving

Before moving a project, ensure conversations are saved locally:

```bash
cd /path/to/your/project
claude-local sync  # Pull latest from global
git add .claude/
git commit -m "Backup conversation history"
```

## Usage

### Commands

#### `claude-local init`

Initialize local storage for the current project.

Options:
- `--no-gitignore`: Skip adding .gitignore entries
- `--force`: Re-initialize even if already set up

```bash
claude-local init
claude-local init --no-gitignore
claude-local init --force
```

#### `claude-local sync`

Sync conversations between global and local storage.

Options:
- `--from-global`: Sync from global to local (default)
- `--to-global`: Sync from local to global (makes conversations available in Claude Code)
- `--bidirectional`: Sync in both directions
- `--dry-run`: Show what would be synced without syncing

```bash
# Import conversations from global to local
claude-local sync

# Export local conversations to global (for /resume in Claude Code)
claude-local sync --to-global

# Sync both directions
claude-local sync --bidirectional

# Preview changes
claude-local sync --dry-run
```

#### `claude-local watch`

Watch for changes and automatically sync conversations.

Options:
- `--bidirectional`: Sync in both directions

```bash
claude-local watch
claude-local watch --bidirectional
```

#### `claude-local status`

Show status of local and global storage, including conversation count and configuration.

```bash
claude-local status
```

#### `claude-local config`

Manage configuration.

```bash
# Set storage mode (global, local, or hybrid)
claude-local config set-mode local

# Set custom global storage path
claude-local config set-global-path /custom/path

# Enable/disable auto-sync
claude-local config auto-sync true

# Show current configuration
claude-local config show

# Reset to defaults
claude-local config reset
```

## Storage Modes

### Local Mode (Default)

Conversations are stored only in the project's `.claude` folder. Perfect for keeping history portable with your project.

```bash
claude-local config set-mode local
```

### Global Mode

Conversations are stored in the global Claude Code directory (original behavior). Use this to disable local storage temporarily.

```bash
claude-local config set-mode global
```

### Hybrid Mode

Conversations are synced to both locations. Best of both worlds!

```bash
claude-local config set-mode hybrid
```

## Project Structure

After initialization, your project will have:

```
your-project/
├── .claude/
│   ├── history/          # Conversation history files (gitignored)
│   ├── README.md         # Documentation
│   └── config.json       # Local configuration (optional)
├── .gitignore            # Updated with .claude entries
└── ...
```

## Git Integration

The tool automatically adds these entries to your `.gitignore`:

```
/.claude/history/
/.claude/*.log
/.claude/cache/
```

This ensures conversation history stays local and doesn't pollute your git repository. You can commit the `.claude` directory structure and README if desired.

## Configuration

Configuration is stored globally at:

- **macOS**: `~/Library/Application Support/claude-local-storage/config.json`
- **Linux**: `~/.config/claude-local-storage/config.json`
- **Windows**: `%APPDATA%/claude-local-storage/config.json`

Default configuration:

```json
{
  "mode": "local",
  "globalStoragePath": "[OS-specific Claude Code path]",
  "autoSync": true,
  "autoGitignore": true,
  "ignorePatterns": [
    "/.claude/history/",
    "/.claude/*.log",
    "/.claude/cache/"
  ]
}
```

## Programmatic Usage

You can also use this as a library:

```typescript
import {
  StorageManager,
  ProjectDetector,
  ConfigManager,
  HistoryWatcher,
} from 'claude-local-storage';

// Initialize storage
const storageManager = new StorageManager();
await storageManager.initializeLocalStorage('/path/to/project');

// Sync conversations
const result = await storageManager.syncToLocal('/path/to/project', {
  bidirectional: true,
});

// Watch for changes
const watcher = new HistoryWatcher(storageManager);
await watcher.startWatching(globalPath, projectRoot);

// Detect project
const detector = new ProjectDetector();
const project = await detector.detectProject();

// Manage configuration
const config = new ConfigManager();
config.setMode('local');
```

## How It Works

1. **Project Detection**: Automatically detects your project root (git repository or current directory)
2. **Conversation Filtering**: Intelligently filters conversations that belong to your project
3. **File Watching**: Monitors global storage for new conversations
4. **Sync Logic**: Copies relevant conversation files between global and local storage
5. **Git Integration**: Ensures history files are properly gitignored

## Troubleshooting

### Conversations not syncing

Make sure:
1. Local storage is initialized: `claude-local init`
2. You've run sync: `claude-local sync`
3. The conversations actually belong to this project (check with `claude-local status`)

### Permission errors

The tool needs read/write access to both global and local storage locations. Check permissions:

```bash
# Check global storage
ls -la ~/Library/Application\ Support/Claude\ Code/

# Check local storage
ls -la .claude/
```

### Wrong project detected

The tool uses git to detect project roots. If you're not in a git repository, it uses the current directory. You can:
1. Initialize git: `git init`
2. Navigate to the correct directory before running commands

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-local-storage.git
cd claude-local-storage

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Link locally for testing
npm link
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Acknowledgments

- Built for the [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) community
- Inspired by the need for portable conversation history

## Roadmap

- [ ] Support for conversation search and filtering
- [ ] Conversation export/import in various formats
- [ ] Web UI for managing conversations
- [ ] Support for conversation tagging and organization
- [ ] Integration with other Claude Code features
- [ ] Automatic backup and restore functionality

## FAQ

**Q: Will this work with future versions of Claude Code?**
A: The tool is designed to work with Claude Code's current storage format. If the format changes, we'll update accordingly.

**Q: Can I commit conversation history to git?**
A: You can, but it's not recommended. Conversations may contain sensitive information. The tool automatically adds history to `.gitignore`.

**Q: Does this modify Claude Code itself?**
A: No, this is a separate tool that works alongside Claude Code by managing conversation files.

**Q: Can I use this on multiple machines?**
A: Yes! When you move your project (via git, cloud storage, etc.), your conversation history moves with it.

**Q: What about privacy/security?**
A: All conversation data stays on your machine. This tool only moves files between local directories - nothing is uploaded anywhere.

## Support

- Report bugs via [GitHub Issues](https://github.com/yourusername/claude-local-storage/issues)
- Ask questions in [Discussions](https://github.com/yourusername/claude-local-storage/discussions)
- Contribute via [Pull Requests](https://github.com/yourusername/claude-local-storage/pulls)

---

Made with by developers who move their projects around a lot.
