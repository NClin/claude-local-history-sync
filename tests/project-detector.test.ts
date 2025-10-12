import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { ProjectDetector } from '../src/core/project-detector.js';
import { StorageManager } from '../src/core/storage-manager.js';

const execAsync = promisify(exec);

describe('ProjectDetector', () => {
  let testDir: string;
  let detector: ProjectDetector;

  beforeEach(async () => {
    testDir = join(tmpdir(), `claude-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    detector = new ProjectDetector();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('detectProject', () => {
    it('should detect non-git project with current directory as root', async () => {
      const project = await detector.detectProject(testDir);

      expect(project.root).toBe(testDir);
      expect(project.isGitRepo).toBe(false);
      expect(project.hasLocalStorage).toBe(false);
    });

    it('should detect git repository', async () => {
      await execAsync('git init', { cwd: testDir });

      const project = await detector.detectProject(testDir);

      expect(project.root).toContain(testDir.replace('/private', ''));
      expect(project.isGitRepo).toBe(true);
    });

    it('should detect existing .claude directory', async () => {
      const claudeDir = join(testDir, '.claude');
      await mkdir(claudeDir, { recursive: true });

      const project = await detector.detectProject(testDir);

      expect(project.claudeDir).toBe(claudeDir);
    });

    it('should detect initialized local storage', async () => {
      const storageManager = new StorageManager();
      await storageManager.initializeLocalStorage(testDir);

      const project = await detector.detectProject(testDir);

      expect(project.hasLocalStorage).toBe(true);
    });
  });

  describe('findProjectRoot', () => {
    it('should return current directory for non-git project', async () => {
      const root = await detector.findProjectRoot(testDir);
      expect(root).toBe(testDir);
    });

    it('should return git root for git repository', async () => {
      await execAsync('git init', { cwd: testDir });
      const subDir = join(testDir, 'src', 'components');
      await mkdir(subDir, { recursive: true });

      const root = await detector.findProjectRoot(subDir);
      expect(root).toContain(testDir.replace('/private', ''));
    });
  });

  describe('hasLocalStorage', () => {
    it('should return false when no local storage', async () => {
      const result = await detector.hasLocalStorage(testDir);
      expect(result).toBe(false);
    });

    it('should return true when local storage exists', async () => {
      const storageManager = new StorageManager();
      await storageManager.initializeLocalStorage(testDir);

      const result = await detector.hasLocalStorage(testDir);
      expect(result).toBe(true);
    });
  });

  describe('validateProject', () => {
    it('should validate existing directory', async () => {
      const result = await detector.validateProject(testDir);

      expect(result.valid).toBe(true);
    });

    it('should warn for non-git repository', async () => {
      const result = await detector.validateProject(testDir);

      expect(result.valid).toBe(true);
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons[0]).toContain('Not a git repository');
    });

    it('should fail for non-existent directory', async () => {
      const result = await detector.validateProject(join(testDir, 'nonexistent'));

      expect(result.valid).toBe(false);
      expect(result.reasons[0]).toContain('does not exist');
    });
  });
});
