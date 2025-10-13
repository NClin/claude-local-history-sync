import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

describe('CLI Integration', () => {
  let testDir: string;
  const cliPath = join(process.cwd(), 'dist', 'cli.js');

  beforeEach(async () => {
    testDir = join(tmpdir(), `claude-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('help commands', () => {
    it('should display main help', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" --help`);

      expect(stdout).toContain('claude-local');
      expect(stdout).toContain('sync');
      expect(stdout).toContain('daemon');
      expect(stdout).toContain('Automatic conversation sync');
    });

    it('should display sync help', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" sync --help`);

      expect(stdout).toContain('Sync all conversations');
      expect(stdout).toContain('bidirectionally');
      expect(stdout).toContain('auto-initializes');
    });

    it('should display daemon help', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" daemon --help`);

      expect(stdout).toContain('automatic background sync');
      expect(stdout).toContain('start');
      expect(stdout).toContain('stop');
    });
  });

  describe('sync command', () => {
    it('should auto-initialize and sync', async () => {
      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" sync`
      );

      expect(stdout).toContain('Initializing local storage');
      expect(stdout).toContain('Local storage initialized');
      expect(stdout).toContain('Syncing conversations');
      expect(stdout).toContain('Synced');

      // Check if .claude directory was created
      const { stdout: lsOutput } = await execAsync(`ls -la "${testDir}"`);
      expect(lsOutput).toContain('.claude');
    });

    it('should sync without re-initializing if already initialized', async () => {
      // First sync (initializes)
      await execAsync(`cd "${testDir}" && node "${cliPath}" sync`);

      // Second sync (should not re-initialize)
      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" sync`
      );

      expect(stdout).not.toContain('Initializing local storage');
      expect(stdout).toContain('Syncing conversations');
      expect(stdout).toContain('Synced');
    });

    it('should always perform bidirectional sync', async () => {
      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" sync`
      );

      expect(stdout).toContain('bidirectional');
    });
  });

  describe('daemon commands', () => {
    it('should display start command info', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" daemon start --help`);

      expect(stdout).toContain('Start automatic background sync');
      expect(stdout).toContain('--paths');
    });

    it('should display stop command info', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" daemon stop --help`);

      expect(stdout).toContain('Stop automatic background sync');
    });

    // Note: We don't test daemon start/stop in CI as it's a long-running process
    // These would be tested in manual/integration testing
  });

  describe('error handling', () => {
    it('should handle invalid commands', async () => {
      try {
        await execAsync(`node "${cliPath}" invalid-command`);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // Commander.js will exit with error code
        expect(error.code).toBeTruthy();
      }
    });

    it('should show version', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" --version`);

      expect(stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('workflow integration', () => {
    it('should complete full sync workflow with auto-initialization', async () => {
      // Sync (auto-initializes)
      const { stdout: syncOutput } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" sync`
      );

      expect(syncOutput).toContain('Initializing local storage');
      expect(syncOutput).toContain('Local storage initialized');
      expect(syncOutput).toContain('Syncing conversations');
      expect(syncOutput).toContain('Synced');

      // Subsequent sync (no re-initialization)
      const { stdout: sync2Output } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" sync`
      );

      expect(sync2Output).not.toContain('Initializing local storage');
      expect(sync2Output).toContain('Syncing conversations');
      expect(sync2Output).toContain('Synced');
    });
  });
});
