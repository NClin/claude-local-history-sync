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
      expect(stdout).toContain('init');
      expect(stdout).toContain('sync');
      expect(stdout).toContain('watch');
      expect(stdout).toContain('status');
      expect(stdout).toContain('config');
      expect(stdout).toContain('daemon');
    });

    it('should display init help', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" init --help`);

      expect(stdout).toContain('Initialize local storage');
      expect(stdout).toContain('--no-gitignore');
      expect(stdout).toContain('--force');
    });

    it('should display sync help', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" sync --help`);

      expect(stdout).toContain('Sync conversations');
      expect(stdout).toContain('--from-global');
      expect(stdout).toContain('--to-global');
      expect(stdout).toContain('--bidirectional');
      expect(stdout).toContain('--dry-run');
    });

    it('should display daemon help', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" daemon --help`);

      expect(stdout).toContain('Manage background');
      expect(stdout).toContain('start');
      expect(stdout).toContain('stop');
      expect(stdout).toContain('status');
    });
  });

  describe('init command', () => {
    it('should initialize local storage', async () => {
      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" init --no-gitignore`
      );

      expect(stdout).toContain('Initializing local storage');
      expect(stdout).toContain('Local storage initialized');

      // Check if .claude directory was created
      const { stdout: lsOutput } = await execAsync(`ls -la "${testDir}"`);
      expect(lsOutput).toContain('.claude');
    });

    it('should handle already initialized storage', async () => {
      // Initialize once
      await execAsync(
        `cd "${testDir}" && node "${cliPath}" init --no-gitignore`
      );

      // Try to initialize again
      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" init --no-gitignore`
      );

      expect(stdout).toContain('already initialized');
    });

    it('should force re-initialization with --force', async () => {
      // Initialize once
      await execAsync(
        `cd "${testDir}" && node "${cliPath}" init --no-gitignore`
      );

      // Force re-initialize
      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" init --no-gitignore --force`
      );

      expect(stdout).toContain('Local storage initialized');
    });
  });

  describe('status command', () => {
    it('should show status without initialization', async () => {
      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" status`
      );

      expect(stdout).toContain('Project Information');
      expect(stdout).toContain('Not initialized');
      expect(stdout).toContain('Configuration');
    });

    it('should show status after initialization', async () => {
      await execAsync(
        `cd "${testDir}" && node "${cliPath}" init --no-gitignore`
      );

      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" status`
      );

      expect(stdout).toContain('Project Information');
      expect(stdout).toContain('Initialized');
      expect(stdout).toContain('Storage Locations');
    });
  });

  describe('sync command', () => {
    it('should require initialization before sync', async () => {
      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" sync`
      );

      expect(stdout).toContain('not initialized');
      expect(stdout).toContain('Run `claude-local init` first');
    });

    it('should sync after initialization', async () => {
      await execAsync(
        `cd "${testDir}" && node "${cliPath}" init --no-gitignore`
      );

      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" sync`
      );

      expect(stdout).toContain('Syncing conversations');
      expect(stdout).toContain('Synced');
    });

    it('should handle dry-run option', async () => {
      await execAsync(
        `cd "${testDir}" && node "${cliPath}" init --no-gitignore`
      );

      const { stdout } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" sync --dry-run`
      );

      expect(stdout).toContain('Dry run');
      expect(stdout).toContain('no files will be modified');
    });
  });

  describe('config commands', () => {
    it('should show configuration', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" config show`);

      expect(stdout).toContain('Configuration');
      expect(stdout).toContain('mode');
      expect(stdout).toContain('autoSync');
      expect(stdout).toContain('autoGitignore');
    });

    it('should set storage mode', async () => {
      const { stdout } = await execAsync(
        `node "${cliPath}" config set-mode hybrid`
      );

      expect(stdout).toContain('Storage mode set to: hybrid');
    });

    it('should reject invalid mode', async () => {
      try {
        await execAsync(`node "${cliPath}" config set-mode invalid`);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid mode');
      }
    });

    it('should enable auto-sync', async () => {
      const { stdout } = await execAsync(
        `node "${cliPath}" config auto-sync true`
      );

      expect(stdout).toContain('Auto-sync enabled');
    });

    it('should disable auto-sync', async () => {
      const { stdout } = await execAsync(
        `node "${cliPath}" config auto-sync false`
      );

      expect(stdout).toContain('Auto-sync disabled');
    });

    it('should set custom global path', async () => {
      const customPath = '/custom/test/path';
      const { stdout } = await execAsync(
        `node "${cliPath}" config set-global-path "${customPath}"`
      );

      expect(stdout).toContain('Global storage path set to');
      expect(stdout).toContain(customPath);
    });

    it('should reset configuration', async () => {
      // Change some settings
      await execAsync(`node "${cliPath}" config set-mode global`);
      await execAsync(`node "${cliPath}" config auto-sync false`);

      // Reset
      const { stdout } = await execAsync(`node "${cliPath}" config reset`);

      expect(stdout).toContain('Configuration reset to defaults');

      // Verify reset
      const { stdout: configOutput } = await execAsync(
        `node "${cliPath}" config show`
      );
      expect(configOutput).toContain('"mode": "local"');
      expect(configOutput).toContain('"autoSync": true');
    });
  });

  describe('daemon commands', () => {
    it('should show daemon status when not running', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" daemon status`);

      expect(stdout).toContain('Daemon Status');
      expect(stdout).toContain('Not running');
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
    it('should complete full init -> status -> sync workflow', async () => {
      // Init
      const { stdout: initOutput } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" init --no-gitignore`
      );
      expect(initOutput).toContain('Local storage initialized');

      // Status
      const { stdout: statusOutput } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" status`
      );
      expect(statusOutput).toContain('Initialized');

      // Sync
      const { stdout: syncOutput } = await execAsync(
        `cd "${testDir}" && node "${cliPath}" sync`
      );
      expect(syncOutput).toContain('Synced');
    });
  });
});
