# Claude Code Local Storage

This directory contains local conversation history for this project.

## Structure

- `history/`: Conversation history files
- `config.json`: Local configuration (if present)

## .gitignore

It's recommended to add the following to your .gitignore:

```
/.claude/history/
/.claude/*.log
/.claude/cache/
```

This ensures conversation history stays local and doesn't get committed to version control.

## Management

Use `claude-local` CLI to manage local storage:

- `claude-local init`: Initialize local storage
- `claude-local sync`: Sync conversations
- `claude-local status`: Check storage status
