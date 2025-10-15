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

      expect(stdout).toContain('claude-sync');
      expect(stdout).toContain('enable');
      expect(stdout).toContain('disable');
      expect(stdout).toContain('status');
      expect(stdout).toContain('Automatic conversation sync');
    });

    it('should display enable help', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" enable --help`);

      expect(stdout).toContain('Enable automatic conversation syncing');
      expect(stdout).toContain('--paths');
    });

    it('should display status help', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" status --help`);

      expect(stdout).toContain('Show sync status');
    });
  });

  describe('status command', () => {
    it('should show disabled status when not running', async () => {
      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" status`
      );

      // Check for checkmark or "Disabled" text
      expect(stdout).toMatch(/Auto-sync.*(?:Disabled|○)/);
    });

    it('should detect current project', async () => {
      // Create .claude directory to make it a valid project
      await mkdir(join(testDir, '.claude', 'history'), { recursive: true });

      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" status`
      );

      expect(stdout).toContain('Current project:');
      expect(stdout).toContain(testDir);
    });
  });

  describe('gitignore commands', () => {
    it('should display gitenable help', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" gitenable --help`);

      expect(stdout).toContain('Add conversation history to .gitignore');
    });

    it('should display gitdisable help', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" gitdisable --help`);

      expect(stdout).toContain('Remove conversation history from .gitignore');
    });

    // Note: We don't test enable/disable in CI as they start long-running processes
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
    it('should show status for current project', async () => {
      // Create .claude directory to make it a valid project
      await mkdir(join(testDir, '.claude', 'history'), { recursive: true });

      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" status`
      );

      expect(stdout).toContain('Claude Sync Status');
      expect(stdout).toContain('Current project:');
      expect(stdout).toContain('Local storage: Yes');
    });
  });
});
