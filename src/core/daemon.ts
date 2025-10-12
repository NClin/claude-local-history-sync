import { watch, FSWatcher } from 'chokidar';
import { join } from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { StorageManager } from './storage-manager.js';
import { ProjectDetector } from './project-detector.js';
import { ConfigManager } from './config-manager.js';
import { getHistoryPath, pathExists } from '../utils/paths.js';

interface MonitoredProject {
  root: string;
  watcher: FSWatcher;
  lastSync: number;
}

/**
 * Background daemon that monitors projects and auto-syncs conversations
 */
export class SyncDaemon {
  private projects: Map<string, MonitoredProject> = new Map();
  private globalWatcher: FSWatcher | null = null;
  private storageManager: StorageManager;
  private configManager: ConfigManager;
  private projectDetector: ProjectDetector;
  private searchPaths: string[];
  private syncDebounceMs = 2000;

  constructor(searchPaths: string[] = [process.env.HOME + '/Projects', process.env.HOME + '/code']) {
    this.searchPaths = searchPaths.filter(Boolean);
    this.configManager = new ConfigManager();
    this.storageManager = new StorageManager(
      this.configManager.getGlobalStoragePath()
    );
    this.projectDetector = new ProjectDetector();
  }

  /**
   * Start the daemon
   */
  async start(): Promise<void> {
    console.log('[claude-local daemon] Starting...');

    // Discover existing projects with .claude folders
    await this.discoverProjects();

    // Watch for new .claude folders being created
    await this.watchForNewProjects();

    // Watch global storage for changes
    await this.watchGlobalStorage();

    console.log(`[claude-local daemon] Monitoring ${this.projects.size} project(s)`);
  }

  /**
   * Discover existing projects with .claude folders
   */
  private async discoverProjects(): Promise<void> {
    for (const searchPath of this.searchPaths) {
      if (!(await pathExists(searchPath))) {
        continue;
      }

      try {
        await this.scanDirectory(searchPath, 3); // Max depth 3
      } catch (error) {
        console.error(`[claude-local daemon] Error scanning ${searchPath}:`, error);
      }
    }
  }

  /**
   * Recursively scan directory for .claude folders
   */
  private async scanDirectory(dir: string, maxDepth: number): Promise<void> {
    if (maxDepth <= 0) return;

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.') && entry.name !== '.claude') continue;

        const fullPath = join(dir, entry.name);

        // Check if this directory has a .claude folder
        if (entry.name === '.claude') {
          const projectRoot = dir;
          const hasHistory = await pathExists(
            getHistoryPath(join(projectRoot, '.claude'))
          );

          if (hasHistory) {
            await this.monitorProject(projectRoot);
          }
        } else {
          // Recurse into subdirectories
          await this.scanDirectory(fullPath, maxDepth - 1);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      return;
    }
  }

  /**
   * Watch for new .claude folders being created
   */
  private async watchForNewProjects(): Promise<void> {
    for (const searchPath of this.searchPaths) {
      if (!(await pathExists(searchPath))) {
        continue;
      }

      watch(join(searchPath, '**/.claude'), {
        ignored: /(node_modules|\.git)/,
        persistent: true,
        ignoreInitial: true,
        depth: 3,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100,
        },
      }).on('addDir', async (path) => {
        // New .claude directory created
        const projectRoot = path.replace(/\/.claude$/, '');
        console.log(`[claude-local daemon] Detected new project: ${projectRoot}`);
        await this.monitorProject(projectRoot);
      });
    }
  }

  /**
   * Monitor a specific project
   */
  private async monitorProject(projectRoot: string): Promise<void> {
    if (this.projects.has(projectRoot)) {
      return; // Already monitoring
    }

    console.log(`[claude-local daemon] Monitoring project: ${projectRoot}`);

    // Initial bidirectional sync
    try {
      await this.syncProject(projectRoot, 'bidirectional');
    } catch (error) {
      console.error(`[claude-local daemon] Initial sync failed for ${projectRoot}:`, error);
    }

    // Watch local .claude/history for changes
    const localHistoryPath = getHistoryPath(join(projectRoot, '.claude'));
    const watcher = watch(localHistoryPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: this.syncDebounceMs,
        pollInterval: 100,
      },
    });

    let syncTimeout: NodeJS.Timeout | null = null;

    watcher.on('all', (event, path) => {
      console.log(`[claude-local daemon] Change detected in ${projectRoot}: ${event} ${path}`);

      // Debounce syncs
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }

      syncTimeout = setTimeout(async () => {
        await this.syncProject(projectRoot, 'to-global');
      }, this.syncDebounceMs);
    });

    this.projects.set(projectRoot, {
      root: projectRoot,
      watcher,
      lastSync: Date.now(),
    });
  }

  /**
   * Watch global storage for changes
   */
  private async watchGlobalStorage(): Promise<void> {
    const globalPath = this.configManager.getGlobalStoragePath();
    const globalHistoryPath = getHistoryPath(globalPath);

    if (!(await pathExists(globalHistoryPath))) {
      console.log('[claude-local daemon] Global storage not found, skipping global watch');
      return;
    }

    this.globalWatcher = watch(globalHistoryPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: this.syncDebounceMs,
        pollInterval: 100,
      },
    });

    const syncTimeouts = new Map<string, NodeJS.Timeout>();

    this.globalWatcher.on('all', async (event, filePath) => {
      console.log(`[claude-local daemon] Global change detected: ${event} ${filePath}`);

      // Sync all monitored projects
      for (const project of this.projects.values()) {
        const key = project.root;

        if (syncTimeouts.has(key)) {
          clearTimeout(syncTimeouts.get(key)!);
        }

        const timeout = setTimeout(async () => {
          await this.syncProject(project.root, 'to-local');
          syncTimeouts.delete(key);
        }, this.syncDebounceMs);

        syncTimeouts.set(key, timeout);
      }
    });
  }

  /**
   * Sync a specific project
   */
  private async syncProject(
    projectRoot: string,
    direction: 'to-local' | 'to-global' | 'bidirectional'
  ): Promise<void> {
    const project = this.projects.get(projectRoot);
    if (!project) return;

    // Rate limiting: don't sync more than once per 5 seconds
    const now = Date.now();
    if (now - project.lastSync < 5000) {
      return;
    }

    try {
      if (direction === 'to-local') {
        await this.storageManager.syncToLocal(projectRoot);
        console.log(`[claude-local daemon] Synced ${projectRoot} to local`);
      } else if (direction === 'to-global') {
        await this.storageManager.syncToGlobal(projectRoot);
        console.log(`[claude-local daemon] Synced ${projectRoot} to global`);
      } else {
        await this.storageManager.syncToLocal(projectRoot, { bidirectional: true });
        console.log(`[claude-local daemon] Bidirectional sync ${projectRoot}`);
      }

      project.lastSync = now;
    } catch (error) {
      console.error(`[claude-local daemon] Sync error for ${projectRoot}:`, error);
    }
  }

  /**
   * Stop the daemon
   */
  async stop(): Promise<void> {
    console.log('[claude-local daemon] Stopping...');

    // Close all project watchers
    for (const project of this.projects.values()) {
      await project.watcher.close();
    }

    // Close global watcher
    if (this.globalWatcher) {
      await this.globalWatcher.close();
    }

    this.projects.clear();
    console.log('[claude-local daemon] Stopped');
  }

  /**
   * Get daemon status
   */
  getStatus(): {
    running: boolean;
    projectCount: number;
    projects: string[];
  } {
    return {
      running: this.projects.size > 0 || this.globalWatcher !== null,
      projectCount: this.projects.size,
      projects: Array.from(this.projects.keys()),
    };
  }
}
