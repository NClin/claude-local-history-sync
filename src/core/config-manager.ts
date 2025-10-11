import Conf from 'conf';
import type { LocalStorageConfig, StorageMode } from '../types/index.js';
import { getGlobalStoragePath } from '../utils/paths.js';

const DEFAULT_CONFIG: LocalStorageConfig = {
  mode: 'local',
  globalStoragePath: getGlobalStoragePath(),
  autoSync: true,
  autoGitignore: true,
  ignorePatterns: ['/.claude/history/', '/.claude/*.log', '/.claude/cache/'],
};

/**
 * Manages configuration for the local storage system
 */
export class ConfigManager {
  private config: Conf<LocalStorageConfig>;

  constructor() {
    this.config = new Conf<LocalStorageConfig>({
      projectName: 'claude-local-storage',
      defaults: DEFAULT_CONFIG,
      schema: {
        mode: {
          type: 'string',
          enum: ['global', 'local', 'hybrid'],
          default: 'local',
        },
        globalStoragePath: {
          type: 'string',
          default: getGlobalStoragePath(),
        },
        autoSync: {
          type: 'boolean',
          default: true,
        },
        autoGitignore: {
          type: 'boolean',
          default: true,
        },
        ignorePatterns: {
          type: 'array',
          items: {
            type: 'string',
          },
          default: ['/.claude/history/', '/.claude/*.log', '/.claude/cache/'],
        },
      },
    });
  }

  /**
   * Get the current configuration
   */
  getConfig(): LocalStorageConfig {
    return {
      mode: this.config.get('mode'),
      globalStoragePath: this.config.get('globalStoragePath'),
      autoSync: this.config.get('autoSync'),
      autoGitignore: this.config.get('autoGitignore'),
      ignorePatterns: this.config.get('ignorePatterns'),
    };
  }

  /**
   * Set the storage mode
   */
  setMode(mode: StorageMode): void {
    this.config.set('mode', mode);
  }

  /**
   * Get the current storage mode
   */
  getMode(): StorageMode {
    return this.config.get('mode');
  }

  /**
   * Set the global storage path
   */
  setGlobalStoragePath(path: string): void {
    this.config.set('globalStoragePath', path);
  }

  /**
   * Get the global storage path
   */
  getGlobalStoragePath(): string {
    return this.config.get('globalStoragePath');
  }

  /**
   * Enable or disable auto-sync
   */
  setAutoSync(enabled: boolean): void {
    this.config.set('autoSync', enabled);
  }

  /**
   * Check if auto-sync is enabled
   */
  isAutoSyncEnabled(): boolean {
    return this.config.get('autoSync');
  }

  /**
   * Enable or disable auto-gitignore
   */
  setAutoGitignore(enabled: boolean): void {
    this.config.set('autoGitignore', enabled);
  }

  /**
   * Check if auto-gitignore is enabled
   */
  isAutoGitignoreEnabled(): boolean {
    return this.config.get('autoGitignore');
  }

  /**
   * Add a custom ignore pattern
   */
  addIgnorePattern(pattern: string): void {
    const patterns = this.config.get('ignorePatterns');
    if (!patterns.includes(pattern)) {
      patterns.push(pattern);
      this.config.set('ignorePatterns', patterns);
    }
  }

  /**
   * Remove an ignore pattern
   */
  removeIgnorePattern(pattern: string): void {
    const patterns = this.config.get('ignorePatterns');
    const filtered = patterns.filter((p: string) => p !== pattern);
    this.config.set('ignorePatterns', filtered);
  }

  /**
   * Get all ignore patterns
   */
  getIgnorePatterns(): string[] {
    return this.config.get('ignorePatterns');
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config.clear();
  }

  /**
   * Get the path to the configuration file
   */
  getConfigPath(): string {
    return this.config.path;
  }
}
