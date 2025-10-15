import chokidar, { type FSWatcher } from 'chokidar';
import { join } from 'node:path';
import { copyFile } from 'node:fs/promises';
import { StorageManager } from './storage-manager.js';
import { getHistoryPath, getGlobalProjectPath } from '../utils/paths.js';

export type WatcherEventType = 'add' | 'change' | 'unlink';

export interface WatcherEvent {
  type: WatcherEventType;
  path: string;
  timestamp: number;
}

export type WatcherCallback = (event: WatcherEvent) => void | Promise<void>;

/**
 * Watches for changes in conversation history and syncs them
 */
export class HistoryWatcher {
  private watcher: FSWatcher | null = null;
  private storageManager: StorageManager;
  private callbacks: WatcherCallback[] = [];

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
  }

  /**
   * Start watching for changes in global storage
   * Now watches the project-specific directory in ~/.claude/projects/<encoded-path>/
   */
  async startWatching(
    globalPath: string,
    projectRoot: string,
    options: {
      bidirectional?: boolean;
      ignoreInitial?: boolean;
    } = {}
  ): Promise<void> {
    // Watch the project-specific global directory
    const globalProjectPath = getGlobalProjectPath(globalPath, projectRoot);
    const localHistoryPath = getHistoryPath(
      join(projectRoot, '.claude')
    );

    this.watcher = chokidar.watch(globalProjectPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: options.ignoreInitial ?? true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', async (path) => {
        await this.handleFileEvent('add', path, localHistoryPath, projectRoot);
      })
      .on('change', async (path) => {
        await this.handleFileEvent('change', path, localHistoryPath, projectRoot);
      })
      .on('unlink', async (path) => {
        await this.handleFileEvent('unlink', path, localHistoryPath, projectRoot);
      });

    // Optionally watch local directory for bidirectional sync
    if (options.bidirectional) {
      const localWatcher = chokidar.watch(localHistoryPath, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100,
        },
      });

      localWatcher
        .on('add', async (path) => {
          await this.handleLocalFileEvent('add', path, globalProjectPath);
        })
        .on('change', async (path) => {
          await this.handleLocalFileEvent('change', path, globalProjectPath);
        });
    }
  }

  /**
   * Handle file events from global storage
   */
  private async handleFileEvent(
    type: WatcherEventType,
    sourcePath: string,
    localHistoryPath: string,
    projectRoot: string
  ): Promise<void> {
    try {
      const event: WatcherEvent = {
        type,
        path: sourcePath,
        timestamp: Date.now(),
      };

      // Notify callbacks
      for (const callback of this.callbacks) {
        await callback(event);
      }

      if (type === 'add' || type === 'change') {
        // Check if this file belongs to the current project
        const belongsToProject = await this.filebelongsToProject(
          sourcePath,
          projectRoot
        );

        if (belongsToProject) {
          const fileName = sourcePath.split('/').pop();
          if (fileName) {
            const destPath = join(localHistoryPath, fileName);
            await copyFile(sourcePath, destPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error handling file event: ${error}`);
    }
  }

  /**
   * Handle file events from local storage (bidirectional sync)
   */
  private async handleLocalFileEvent(
    type: WatcherEventType,
    sourcePath: string,
    globalHistoryPath: string
  ): Promise<void> {
    try {
      if (type === 'add' || type === 'change') {
        const fileName = sourcePath.split('/').pop();
        if (fileName) {
          const destPath = join(globalHistoryPath, fileName);
          await copyFile(sourcePath, destPath);
        }
      }
    } catch (error) {
      console.error(`Error handling local file event: ${error}`);
    }
  }

  /**
   * Check if a conversation file belongs to a specific project
   */
  private async filebelongsToProject(
    filePath: string,
    projectRoot: string
  ): Promise<boolean> {
    try {
      const { readFile } = await import('node:fs/promises');
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      return (
        data.workingDirectory === projectRoot ||
        data.cwd === projectRoot ||
        JSON.stringify(data).includes(projectRoot)
      );
    } catch {
      return false;
    }
  }

  /**
   * Register a callback for file events
   */
  on(callback: WatcherCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Unregister a callback
   */
  off(callback: WatcherCallback): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  /**
   * Stop watching for changes
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Check if the watcher is currently active
   */
  isWatching(): boolean {
    return this.watcher !== null;
  }
}
