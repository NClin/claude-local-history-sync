import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import {
  getGlobalStoragePath,
  getLocalStoragePath,
  getHistoryPath,
  pathExists,
  isWritable,
  resolvePath,
  normalizePath,
} from '../src/utils/paths.js';

describe('Path Utilities', () => {
  describe('getGlobalStoragePath', () => {
    it('should return a valid path', () => {
      const path = getGlobalStoragePath();
      expect(path).toBeTruthy();
      expect(path).toContain('Claude Code');
    });

    it('should return platform-specific path', () => {
      const path = getGlobalStoragePath();
      const platform = process.platform;

      if (platform === 'darwin') {
        expect(path).toContain('Library/Application Support');
      } else if (platform === 'win32') {
        expect(path).toContain('AppData');
      } else {
        expect(path).toContain('.config');
      }
    });
  });

  describe('getLocalStoragePath', () => {
    it('should append .claude to project root', () => {
      const projectRoot = '/path/to/project';
      const localPath = getLocalStoragePath(projectRoot);

      expect(localPath).toBe(join(projectRoot, '.claude'));
    });
  });

  describe('getHistoryPath', () => {
    it('should append history to storage path', () => {
      const storagePath = '/path/to/storage';
      const historyPath = getHistoryPath(storagePath);

      expect(historyPath).toBe(join(storagePath, 'history'));
    });
  });

  describe('pathExists', () => {
    it('should return true for existing directory', async () => {
      const result = await pathExists(process.cwd());
      expect(result).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      const result = await pathExists('/nonexistent/path/12345');
      expect(result).toBe(false);
    });
  });

  describe('isWritable', () => {
    it('should return true for writable directory', async () => {
      const result = await isWritable(process.cwd());
      expect(result).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      const result = await isWritable('/nonexistent/path/12345');
      expect(result).toBe(false);
    });
  });

  describe('resolvePath', () => {
    it('should resolve relative path', () => {
      const resolved = resolvePath('.');
      expect(resolved).toBe(process.cwd());
    });

    it('should resolve nested relative path', () => {
      const resolved = resolvePath('./src/test');
      expect(resolved).toContain(process.cwd());
      expect(resolved).toContain('src');
      expect(resolved).toContain('test');
    });
  });

  describe('normalizePath', () => {
    it('should normalize path separators', () => {
      const normalized = normalizePath('/path/to/file');
      expect(normalized).toBeTruthy();
      expect(normalized).not.toContain('\\\\');
    });

    it('should resolve absolute path', () => {
      const normalized = normalizePath('.');
      expect(normalized).toBe(process.cwd());
    });
  });
});
