import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { StorageManager } from '../src/core/storage-manager.js';

describe('StorageManager', () => {
  let testDir: string;
  let storageManager: StorageManager;

  beforeEach(async () => {
    testDir = join(tmpdir(), `claude-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    storageManager = new StorageManager(join(testDir, 'global'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('initializeLocalStorage', () => {
    it('should create .claude/history directory structure', async () => {
      const projectRoot = join(testDir, 'project');
      await mkdir(projectRoot, { recursive: true });

      await storageManager.initializeLocalStorage(projectRoot);

      const locations = await storageManager.getStorageLocations(projectRoot);
      expect(locations.local?.exists).toBe(true);
      expect(locations.local?.path).toContain('.claude/history');
    });

    it('should create a README file in .claude directory', async () => {
      const projectRoot = join(testDir, 'project');
      await mkdir(projectRoot, { recursive: true });

      await storageManager.initializeLocalStorage(projectRoot);

      const { readFile } = await import('node:fs/promises');
      const readme = await readFile(
        join(projectRoot, '.claude', 'README.md'),
        'utf-8'
      );
      expect(readme).toContain('Claude Sync');
    });
  });

  describe('getStorageLocations', () => {
    it('should return global storage location', async () => {
      const locations = await storageManager.getStorageLocations();

      expect(locations.global).toBeDefined();
      expect(locations.global.type).toBe('global');
      expect(locations.global.path).toContain('global');
    });

    it('should return local storage location when project provided', async () => {
      const projectRoot = join(testDir, 'project');
      await mkdir(projectRoot, { recursive: true });
      await storageManager.initializeLocalStorage(projectRoot);

      const locations = await storageManager.getStorageLocations(projectRoot);

      expect(locations.local).toBeDefined();
      expect(locations.local?.type).toBe('local');
      expect(locations.local?.exists).toBe(true);
    });
  });

  describe('syncToLocal', () => {
    it('should sync conversation files from global to local', async () => {
      const projectRoot = join(testDir, 'project');
      await mkdir(projectRoot, { recursive: true });
      await storageManager.initializeLocalStorage(projectRoot);

      // Create mock conversation file in global storage
      const globalHistory = join(testDir, 'global', 'history');
      await mkdir(globalHistory, { recursive: true });

      const conversationData = {
        workingDirectory: projectRoot,
        messages: [{ role: 'user', content: 'test' }],
      };

      await writeFile(
        join(globalHistory, 'conv-1.json'),
        JSON.stringify(conversationData)
      );

      const result = await storageManager.syncToLocal(projectRoot);

      expect(result.success).toBe(true);
      expect(result.filesProcessed).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should only sync files belonging to the project', async () => {
      const projectRoot = join(testDir, 'project');
      const otherProject = join(testDir, 'other');
      await mkdir(projectRoot, { recursive: true });
      await storageManager.initializeLocalStorage(projectRoot);

      // Create mock conversation files
      const globalHistory = join(testDir, 'global', 'history');
      await mkdir(globalHistory, { recursive: true });

      await writeFile(
        join(globalHistory, 'conv-project.json'),
        JSON.stringify({
          workingDirectory: projectRoot,
          messages: [],
        })
      );

      await writeFile(
        join(globalHistory, 'conv-other.json'),
        JSON.stringify({
          workingDirectory: otherProject,
          messages: [],
        })
      );

      const result = await storageManager.syncToLocal(projectRoot);

      expect(result.success).toBe(true);
      expect(result.filesProcessed).toBe(1);
    });
  });

  describe('cleanLocalStorage', () => {
    it('should remove local history directory', async () => {
      const projectRoot = join(testDir, 'project');
      await mkdir(projectRoot, { recursive: true });
      await storageManager.initializeLocalStorage(projectRoot);

      await storageManager.cleanLocalStorage(projectRoot);

      const locations = await storageManager.getStorageLocations(projectRoot);
      expect(locations.local?.exists).toBe(false);
    });

    it('should preserve config when requested', async () => {
      const projectRoot = join(testDir, 'project');
      await mkdir(projectRoot, { recursive: true });
      await storageManager.initializeLocalStorage(projectRoot);

      // Create a config file
      await writeFile(
        join(projectRoot, '.claude', 'config.json'),
        JSON.stringify({ test: true })
      );

      await storageManager.cleanLocalStorage(projectRoot, {
        preserveConfig: true,
      });

      const { readFile } = await import('node:fs/promises');
      const config = await readFile(
        join(projectRoot, '.claude', 'config.json'),
        'utf-8'
      );
      expect(JSON.parse(config)).toEqual({ test: true });
    });
  });

  describe('getConversationMetadata', () => {
    it('should return metadata for conversations', async () => {
      const projectRoot = join(testDir, 'project');
      await mkdir(projectRoot, { recursive: true });
      await storageManager.initializeLocalStorage(projectRoot);

      const localPath = join(projectRoot, '.claude');
      const localHistory = join(localPath, 'history');
      const conversationData = {
        workingDirectory: projectRoot,
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi' },
        ],
        title: 'Test Conversation',
      };

      await writeFile(
        join(localHistory, 'conv-test.json'),
        JSON.stringify(conversationData)
      );

      const metadata = await storageManager.getConversationMetadata(localPath);

      expect(metadata).toHaveLength(1);
      expect(metadata[0].id).toBe('conv-test');
      expect(metadata[0].messageCount).toBe(2);
      expect(metadata[0].title).toBe('Test Conversation');
      expect(metadata[0].projectPath).toBe(projectRoot);
    });
  });

  describe('syncToGlobal', () => {
    it('should sync conversations from local to global', async () => {
      const projectRoot = join(testDir, 'project');
      await mkdir(projectRoot, { recursive: true });
      await storageManager.initializeLocalStorage(projectRoot);

      // Create conversation in local storage
      const localHistory = join(projectRoot, '.claude', 'history');
      const conversationData = {
        workingDirectory: projectRoot,
        messages: [{ role: 'user', content: 'test' }],
      };

      await writeFile(
        join(localHistory, 'conv-local.json'),
        JSON.stringify(conversationData)
      );

      const result = await storageManager.syncToGlobal(projectRoot);

      expect(result.success).toBe(true);
      expect(result.filesProcessed).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if local storage not initialized', async () => {
      const projectRoot = join(testDir, 'project');
      await mkdir(projectRoot, { recursive: true });

      const result = await storageManager.syncToGlobal(projectRoot);

      expect(result.success).toBe(false);
      expect(result.filesProcessed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('not initialized');
    });
  });
});
