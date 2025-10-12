import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '../src/core/config-manager.js';
import { unlink } from 'node:fs/promises';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let configPath: string;

  beforeEach(() => {
    configManager = new ConfigManager();
    configPath = configManager.getConfigPath();
  });

  afterEach(async () => {
    // Clean up config file
    try {
      await unlink(configPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('getConfig', () => {
    it('should return default configuration', () => {
      const config = configManager.getConfig();

      expect(config.mode).toBe('local');
      expect(config.autoSync).toBe(true);
      expect(config.autoGitignore).toBe(true);
      expect(config.ignorePatterns).toContain('/.claude/history/');
    });
  });

  describe('setMode', () => {
    it('should set storage mode', () => {
      configManager.setMode('hybrid');
      const mode = configManager.getMode();

      expect(mode).toBe('hybrid');
    });

    it('should persist mode across instances', () => {
      configManager.setMode('global');

      const newInstance = new ConfigManager();
      expect(newInstance.getMode()).toBe('global');
    });
  });

  describe('setGlobalStoragePath', () => {
    it('should set custom global storage path', () => {
      const customPath = '/custom/path/to/storage';
      configManager.setGlobalStoragePath(customPath);

      expect(configManager.getGlobalStoragePath()).toBe(customPath);
    });
  });

  describe('autoSync', () => {
    it('should enable auto-sync', () => {
      configManager.setAutoSync(true);
      expect(configManager.isAutoSyncEnabled()).toBe(true);
    });

    it('should disable auto-sync', () => {
      configManager.setAutoSync(false);
      expect(configManager.isAutoSyncEnabled()).toBe(false);
    });
  });

  describe('autoGitignore', () => {
    it('should enable auto-gitignore', () => {
      configManager.setAutoGitignore(true);
      expect(configManager.isAutoGitignoreEnabled()).toBe(true);
    });

    it('should disable auto-gitignore', () => {
      configManager.setAutoGitignore(false);
      expect(configManager.isAutoGitignoreEnabled()).toBe(false);
    });
  });

  describe('ignorePatterns', () => {
    it('should add custom ignore pattern', () => {
      configManager.addIgnorePattern('/.claude/custom/');
      const patterns = configManager.getIgnorePatterns();

      expect(patterns).toContain('/.claude/custom/');
    });

    it('should not add duplicate patterns', () => {
      configManager.addIgnorePattern('/.claude/history/');
      const patterns = configManager.getIgnorePatterns();

      const count = patterns.filter((p) => p === '/.claude/history/').length;
      expect(count).toBe(1);
    });

    it('should remove ignore pattern', () => {
      configManager.addIgnorePattern('/.claude/temp/');
      configManager.removeIgnorePattern('/.claude/temp/');

      const patterns = configManager.getIgnorePatterns();
      expect(patterns).not.toContain('/.claude/temp/');
    });
  });

  describe('reset', () => {
    it('should reset configuration to defaults', () => {
      configManager.setMode('global');
      configManager.setAutoSync(false);

      configManager.reset();

      const config = configManager.getConfig();
      expect(config.mode).toBe('local');
      expect(config.autoSync).toBe(true);
    });
  });

  describe('getConfigPath', () => {
    it('should return valid config file path', () => {
      const path = configManager.getConfigPath();
      expect(path).toContain('claude-local-storage');
      expect(path).toContain('config.json');
    });
  });
});
