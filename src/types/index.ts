/**
 * Storage mode configuration
 */
export type StorageMode = 'global' | 'local' | 'hybrid';

/**
 * Configuration for the local storage system
 */
export interface LocalStorageConfig {
  /** Storage mode: global (original behavior), local (project-only), or hybrid (sync both) */
  mode: StorageMode;
  /** Path to the global Claude Code storage directory */
  globalStoragePath: string;
  /** Whether to auto-sync on file changes */
  autoSync: boolean;
  /** Whether to create .gitignore entries automatically */
  autoGitignore: boolean;
  /** Custom ignore patterns for history files */
  ignorePatterns: string[];
}

/**
 * Conversation metadata
 */
export interface ConversationMetadata {
  id: string;
  projectPath: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  title?: string;
}

/**
 * Storage location information
 */
export interface StorageLocation {
  /** Path to the storage directory */
  path: string;
  /** Whether this is the global or local storage */
  type: 'global' | 'local';
  /** Whether the location exists */
  exists: boolean;
}

/**
 * Sync operation result
 */
export interface SyncResult {
  success: boolean;
  filesProcessed: number;
  errors: Error[];
  duration: number;
}

/**
 * Project detection result
 */
export interface ProjectInfo {
  /** Root directory of the project */
  root: string;
  /** Whether this is a git repository */
  isGitRepo: boolean;
  /** Existing .claude directory path if present */
  claudeDir?: string;
  /** Whether local storage is initialized */
  hasLocalStorage: boolean;
}
