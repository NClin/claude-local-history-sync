/**
 * Claude Code Local Storage
 *
 * A tool for managing Claude Code conversation history in project-local .claude folders
 */

export { StorageManager } from './core/storage-manager.js';
export { ProjectDetector } from './core/project-detector.js';
export { ConfigManager } from './core/config-manager.js';
export { HistoryWatcher } from './core/watcher.js';

export * from './types/index.js';
export * from './utils/paths.js';
export * from './utils/git.js';
