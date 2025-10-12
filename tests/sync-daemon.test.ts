import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { SyncDaemon } from '../src/core/daemon.js';
import { StorageManager } from '../src/core/storage-manager.js';
import { ConfigManager } from '../src/core/config-manager.js';

const execAsync = promisify(exec);

describe('SyncDaemon', () => {
  let testDir: string;
  let daemon: SyncDaemon;
  let searchPath: string;
  let globalPath: string;
  let configManager: ConfigManager;
  let originalGlobalPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `claude-test-${Date.now()}`);
    searchPath = join(testDir, 'search');
    globalPath = join(testDir, 'global', 'history');
    await mkdir(searchPath, { recursive: true });
    await mkdir(globalPath, { recursive: true });

    // Store original global path and set test path
    configManager = new ConfigManager();
    originalGlobalPath = configManager.getGlobalStoragePath();

    // If no path was set (config was deleted by another test), use default
    if (!originalGlobalPath) {
      const { getGlobalStoragePath: getDefaultPath } = await import('../src/utils/paths.js');
      originalGlobalPath = getDefaultPath();
      // Also set it so config is in a good state
      configManager.setGlobalStoragePath(originalGlobalPath);
    }

    // Now set test path
    configManager.setGlobalStoragePath(join(testDir, 'global'));
  });

  afterEach(async () => {
    if (daemon) {
      await daemon.stop();
    }
    // Always restore original config
    configManager.setGlobalStoragePath(originalGlobalPath);
    await rm(testDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('should create daemon with custom search paths', () => {
      daemon = new SyncDaemon([searchPath]);
      expect(daemon).toBeDefined();
    });

    it('should start daemon', async () => {
      // Create a project to ensure daemon has something to watch
      const project1 = join(searchPath, 'project1');
      await mkdir(join(project1, '.claude', 'history'), { recursive: true });

      daemon = new SyncDaemon([searchPath]);
      await daemon.start();

      // Give it time to discover project
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const status = daemon.getStatus();
      expect(status.running).toBe(true);
    });

    it('should stop daemon', async () => {
      daemon = new SyncDaemon([searchPath]);
      await daemon.start();
      await daemon.stop();

      const status = daemon.getStatus();
      expect(status.running).toBe(false);
    });
  });

  describe('project discovery', () => {
    it('should discover existing projects with .claude folders', async () => {
      // Create a project with .claude folder
      const project1 = join(searchPath, 'project1');
      const claude1 = join(project1, '.claude', 'history');
      await mkdir(claude1, { recursive: true });

      daemon = new SyncDaemon([searchPath]);
      await daemon.start();

      // Give it time to discover
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const status = daemon.getStatus();
      expect(status.projectCount).toBeGreaterThan(0);
      expect(status.projects).toContain(project1);
    });

    it('should discover multiple projects', async () => {
      // Create multiple projects
      const project1 = join(searchPath, 'project1');
      const project2 = join(searchPath, 'subdir', 'project2');

      await mkdir(join(project1, '.claude', 'history'), { recursive: true });
      await mkdir(join(project2, '.claude', 'history'), { recursive: true });

      daemon = new SyncDaemon([searchPath]);
      await daemon.start();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const status = daemon.getStatus();
      expect(status.projectCount).toBe(2);
      expect(status.projects).toContain(project1);
      expect(status.projects).toContain(project2);
    });

    it('should not discover projects without .claude/history', async () => {
      // Create a project without proper structure
      const project1 = join(searchPath, 'project1');
      await mkdir(project1, { recursive: true });

      daemon = new SyncDaemon([searchPath]);
      await daemon.start();

      await new Promise((resolve) => setTimeout(resolve, 500));

      const status = daemon.getStatus();
      expect(status.projectCount).toBe(0);
    });

    it('should respect max depth when scanning', async () => {
      // Create a deeply nested project (depth > 3)
      const deepProject = join(searchPath, 'a', 'b', 'c', 'd', 'project');
      await mkdir(join(deepProject, '.claude', 'history'), {
        recursive: true,
      });

      daemon = new SyncDaemon([searchPath]);
      await daemon.start();

      await new Promise((resolve) => setTimeout(resolve, 500));

      const status = daemon.getStatus();
      // Should not discover deeply nested projects
      expect(status.projects).not.toContain(deepProject);
    });
  });

  describe('watching for new projects', () => {
    it('should detect new .claude folders', async () => {
      daemon = new SyncDaemon([searchPath]);
      await daemon.start();

      const initialStatus = daemon.getStatus();
      const initialCount = initialStatus.projectCount;

      // Create a new project after daemon is running
      const newProject = join(searchPath, 'new-project');
      await mkdir(join(newProject, '.claude', 'history'), {
        recursive: true,
      });

      // Wait for watcher to detect
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const updatedStatus = daemon.getStatus();
      expect(updatedStatus.projectCount).toBeGreaterThan(initialCount);
    }, 10000);
  });

  describe('synchronization', () => {
    it('should perform initial bidirectional sync', async () => {
      const project = join(searchPath, 'project');
      const storageManager = new StorageManager(join(testDir, 'global'));
      await storageManager.initializeLocalStorage(project);

      // Create a conversation in local storage
      const localHistory = join(project, '.claude', 'history');
      const conversationData = {
        workingDirectory: project,
        messages: [{ role: 'user', content: 'test' }],
      };

      await writeFile(
        join(localHistory, 'test-conv.json'),
        JSON.stringify(conversationData)
      );

      daemon = new SyncDaemon([searchPath]);
      await daemon.start();

      // Wait for initial sync
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const status = daemon.getStatus();
      expect(status.projectCount).toBe(1);
    });
  });

  describe('status', () => {
    it('should return correct running status', async () => {
      // Create a project to ensure daemon has something to monitor
      const project1 = join(searchPath, 'project1');
      await mkdir(join(project1, '.claude', 'history'), { recursive: true });

      daemon = new SyncDaemon([searchPath]);

      let status = daemon.getStatus();
      expect(status.running).toBe(false);
      expect(status.projectCount).toBe(0);

      await daemon.start();

      // Give it time to discover project and start watchers
      await new Promise((resolve) => setTimeout(resolve, 1000));

      status = daemon.getStatus();
      expect(status.running).toBe(true);
      expect(status.projectCount).toBeGreaterThan(0);
    });

    it('should return list of monitored projects', async () => {
      const project1 = join(searchPath, 'project1');
      await mkdir(join(project1, '.claude', 'history'), { recursive: true });

      daemon = new SyncDaemon([searchPath]);
      await daemon.start();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const status = daemon.getStatus();
      expect(Array.isArray(status.projects)).toBe(true);
      expect(status.projects.length).toBe(status.projectCount);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent search paths', async () => {
      const nonExistent = join(testDir, 'nonexistent');
      daemon = new SyncDaemon([nonExistent]);

      // Should not throw
      await expect(daemon.start()).resolves.not.toThrow();

      const status = daemon.getStatus();
      expect(status.projectCount).toBe(0);
    });

    it('should handle empty search paths', async () => {
      daemon = new SyncDaemon([]);

      await expect(daemon.start()).resolves.not.toThrow();

      const status = daemon.getStatus();
      expect(status.projectCount).toBe(0);
    });

    it('should stop gracefully even if not started', async () => {
      daemon = new SyncDaemon([searchPath]);

      await expect(daemon.stop()).resolves.not.toThrow();
    });

    it('should handle multiple stop calls', async () => {
      daemon = new SyncDaemon([searchPath]);
      await daemon.start();
      await daemon.stop();

      await expect(daemon.stop()).resolves.not.toThrow();
    });
  });

  describe('rate limiting', () => {
    it('should not sync the same project too frequently', async () => {
      const project = join(searchPath, 'project');
      await mkdir(join(project, '.claude', 'history'), { recursive: true });

      daemon = new SyncDaemon([searchPath]);
      await daemon.start();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Multiple rapid file changes should be rate-limited
      const localHistory = join(project, '.claude', 'history');
      for (let i = 0; i < 5; i++) {
        await writeFile(
          join(localHistory, `conv-${i}.json`),
          JSON.stringify({
            workingDirectory: project,
            messages: [],
          })
        );
      }

      // Daemon should handle this gracefully with rate limiting
      const status = daemon.getStatus();
      expect(status.running).toBe(true);
    });
  });
});
