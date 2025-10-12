import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import {
  isGitRepository,
  getGitRoot,
  updateGitignore,
  getRecommendedGitignoreEntries,
  isGitIgnored,
} from '../src/utils/git.js';

const execAsync = promisify(exec);

describe('Git Utilities', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `claude-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('isGitRepository', () => {
    it('should return false for non-git directory', async () => {
      const result = await isGitRepository(testDir);
      expect(result).toBe(false);
    });

    it('should return true for git repository', async () => {
      await execAsync('git init', { cwd: testDir });
      const result = await isGitRepository(testDir);
      expect(result).toBe(true);
    });
  });

  describe('getGitRoot', () => {
    it('should return null for non-git directory', async () => {
      const result = await getGitRoot(testDir);
      expect(result).toBeNull();
    });

    it('should return root for git repository', async () => {
      await execAsync('git init', { cwd: testDir });
      const result = await getGitRoot(testDir);
      expect(result).toContain(testDir.replace('/private', ''));
    });

    it('should return root from subdirectory', async () => {
      await execAsync('git init', { cwd: testDir });
      const subDir = join(testDir, 'src');
      await mkdir(subDir);

      const result = await getGitRoot(subDir);
      expect(result).toContain(testDir.replace('/private', ''));
    });
  });

  describe('updateGitignore', () => {
    it('should create .gitignore if it does not exist', async () => {
      await updateGitignore(testDir, ['/.claude/history/']);

      const content = await readFile(join(testDir, '.gitignore'), 'utf-8');
      expect(content).toContain('/.claude/history/');
    });

    it('should append to existing .gitignore', async () => {
      await writeFile(join(testDir, '.gitignore'), 'node_modules/\n');
      await updateGitignore(testDir, ['/.claude/history/']);

      const content = await readFile(join(testDir, '.gitignore'), 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('/.claude/history/');
    });

    it('should not add duplicate entries', async () => {
      await updateGitignore(testDir, ['/.claude/history/']);
      await updateGitignore(testDir, ['/.claude/history/']);

      const content = await readFile(join(testDir, '.gitignore'), 'utf-8');
      const count = (content.match(/\/\.claude\/history\//g) || []).length;
      expect(count).toBe(1);
    });

    it('should add header comment', async () => {
      await updateGitignore(testDir, ['/.claude/history/']);

      const content = await readFile(join(testDir, '.gitignore'), 'utf-8');
      expect(content).toContain('Claude Code local storage');
    });
  });

  describe('getRecommendedGitignoreEntries', () => {
    it('should return standard entries', () => {
      const entries = getRecommendedGitignoreEntries();

      expect(entries).toContain('/.claude/history/');
      expect(entries).toContain('/.claude/*.log');
      expect(entries).toContain('/.claude/cache/');
    });

    it('should return array of strings', () => {
      const entries = getRecommendedGitignoreEntries();

      expect(Array.isArray(entries)).toBe(true);
      entries.forEach((entry) => {
        expect(typeof entry).toBe('string');
      });
    });
  });

  describe('isGitIgnored', () => {
    it('should return false for non-ignored file', async () => {
      await execAsync('git init', { cwd: testDir });
      const filePath = join(testDir, 'test.txt');
      await writeFile(filePath, 'test');

      const result = await isGitIgnored(filePath, testDir);
      expect(result).toBe(false);
    });

    it('should return true for ignored file', async () => {
      await execAsync('git init', { cwd: testDir });
      await writeFile(join(testDir, '.gitignore'), '*.log\n');
      const filePath = join(testDir, 'test.log');
      await writeFile(filePath, 'test');

      const result = await isGitIgnored(filePath, testDir);
      expect(result).toBe(true);
    });
  });
});
