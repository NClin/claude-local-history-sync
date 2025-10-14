#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from './core/config-manager.js';
import { SyncDaemon } from './core/daemon.js';
import { updateGitignore, removeFromGitignore, getRecommendedGitignoreEntries } from './utils/git.js';
import { ProjectDetector } from './core/project-detector.js';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const program = new Command();
const configManager = new ConfigManager();
const projectDetector = new ProjectDetector();

program
  .name('claude-sync')
  .description('Automatic conversation sync for Claude Code')
  .version('0.1.0');

/**
 * Enable automatic syncing
 */
program
  .command('enable')
  .description('Enable automatic conversation syncing')
  .option('--paths <paths...>', 'Custom paths to monitor (default: ~/Projects, ~/code, ~/src)')
  .action(async (options) => {
    try {
      const pidFile = join(homedir(), '.claude-sync-daemon.pid');
      const configFile = join(homedir(), '.claude-sync-config.json');

      // Check if already running
      if (existsSync(pidFile)) {
        try {
          const pid = await readFile(pidFile, 'utf-8');
          // Check if process is actually running
          try {
            process.kill(parseInt(pid), 0);
            console.log(chalk.yellow('✓ Auto-sync is already enabled'));
            return;
          } catch {
            // Process not running, clean up stale PID file
            await unlink(pidFile).catch(() => {});
          }
        } catch {
          // PID file unreadable, continue
        }
      }

      const searchPaths = options.paths || [
        join(homedir(), 'Projects'),
        join(homedir(), 'code'),
        join(homedir(), 'src'),
      ];

      // Save config
      await writeFile(configFile, JSON.stringify({ searchPaths, enabled: true }, null, 2));

      console.log(chalk.blue('Starting automatic sync...'));
      console.log(chalk.gray('Monitoring:'));
      searchPaths.forEach((p: string) => console.log(chalk.gray(`  • ${p}`)));

      const daemon = new SyncDaemon(searchPaths);
      await daemon.start();

      // Save PID
      await writeFile(pidFile, process.pid.toString());

      console.log(chalk.green('✓ Auto-sync enabled'));
      console.log(chalk.gray('\nConversations will now sync automatically between projects'));
      console.log(chalk.gray('Use `claude-sync disable` to stop'));

      // Keep process running
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\nDisabling auto-sync...'));
        await daemon.stop();
        await unlink(pidFile).catch(() => {});
        await unlink(configFile).catch(() => {});
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        await daemon.stop();
        await unlink(pidFile).catch(() => {});
        process.exit(0);
      });
    } catch (error) {
      console.error(
        chalk.red('Error enabling auto-sync:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

/**
 * Disable automatic syncing
 */
program
  .command('disable')
  .description('Disable automatic conversation syncing')
  .action(async () => {
    try {
      const pidFile = join(homedir(), '.claude-sync-daemon.pid');
      const configFile = join(homedir(), '.claude-sync-config.json');

      if (!existsSync(pidFile)) {
        console.log(chalk.yellow('Auto-sync is not enabled'));
        return;
      }

      try {
        const pid = await readFile(pidFile, 'utf-8');
        console.log(chalk.blue('Stopping auto-sync...'));

        // Send SIGTERM to daemon
        try {
          process.kill(parseInt(pid), 'SIGTERM');
          console.log(chalk.green('✓ Auto-sync disabled'));
        } catch {
          console.log(chalk.yellow('Daemon process not found, cleaning up...'));
        }

        // Remove PID and config files
        await unlink(pidFile).catch(() => {});
        await unlink(configFile).catch(() => {});
      } catch (error) {
        console.log(chalk.yellow('Could not stop daemon, cleaning up...'));
        await unlink(pidFile).catch(() => {});
        await unlink(configFile).catch(() => {});
      }
    } catch (error) {
      console.error(
        chalk.red('Error disabling auto-sync:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

/**
 * Add .claude/history to .gitignore
 */
program
  .command('gitenable')
  .description('Add conversation history to .gitignore (prevents committing)')
  .action(async () => {
    try {
      const project = await projectDetector.detectProject();

      if (!project.isGitRepo) {
        console.log(chalk.yellow('Not a git repository'));
        console.log(chalk.gray('This command only works in git repositories'));
        return;
      }

      console.log(chalk.blue('Adding .claude/history to .gitignore...'));
      console.log(chalk.gray(`Project: ${project.root}`));

      await updateGitignore(project.root, getRecommendedGitignoreEntries());

      console.log(chalk.green('✓ Conversation history will not be committed'));
      console.log(chalk.gray('\nUse `claude-sync gitdisable` to allow committing conversations'));
    } catch (error) {
      console.error(
        chalk.red('Error updating .gitignore:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

/**
 * Remove .claude/history from .gitignore
 */
program
  .command('gitdisable')
  .description('Remove conversation history from .gitignore (allow committing)')
  .action(async () => {
    try {
      const project = await projectDetector.detectProject();

      if (!project.isGitRepo) {
        console.log(chalk.yellow('Not a git repository'));
        console.log(chalk.gray('This command only works in git repositories'));
        return;
      }

      console.log(chalk.blue('Removing .claude/history from .gitignore...'));
      console.log(chalk.gray(`Project: ${project.root}`));

      await removeFromGitignore(project.root, getRecommendedGitignoreEntries());

      console.log(chalk.green('✓ Conversation history can now be committed'));
      console.log(chalk.gray('\nUse `claude-sync gitenable` to prevent committing conversations'));
    } catch (error) {
      console.error(
        chalk.red('Error updating .gitignore:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

/**
 * Show status
 */
program
  .command('status')
  .description('Show sync status')
  .action(async () => {
    try {
      const pidFile = join(homedir(), '.claude-sync-daemon.pid');
      const configFile = join(homedir(), '.claude-sync-config.json');

      console.log(chalk.bold('\nClaude Sync Status\n'));

      // Check if enabled
      if (existsSync(pidFile)) {
        try {
          const pid = await readFile(pidFile, 'utf-8');
          try {
            process.kill(parseInt(pid), 0);
            console.log(chalk.green('✓ Auto-sync: Enabled'));

            // Show config
            if (existsSync(configFile)) {
              const config = JSON.parse(await readFile(configFile, 'utf-8'));
              console.log(chalk.gray('\nMonitoring:'));
              config.searchPaths?.forEach((p: string) => console.log(chalk.gray(`  • ${p}`)));
            }
          } catch {
            console.log(chalk.yellow('⚠ Auto-sync: Disabled (stale PID file)'));
          }
        } catch {
          console.log(chalk.yellow('⚠ Auto-sync: Disabled'));
        }
      } else {
        console.log(chalk.gray('○ Auto-sync: Disabled'));
        console.log(chalk.gray('\nRun `claude-sync enable` to start auto-syncing'));
      }

      // Check current project
      try {
        const project = await projectDetector.detectProject();
        console.log(chalk.gray(`\nCurrent project: ${project.root}`));
        console.log(chalk.gray(`Local storage: ${project.hasLocalStorage ? 'Yes' : 'No'}`));

        if (project.isGitRepo) {
          // Check gitignore status
          const gitignorePath = join(project.root, '.gitignore');
          if (existsSync(gitignorePath)) {
            const gitignoreContent = await readFile(gitignorePath, 'utf-8');
            const hasGitignore = gitignoreContent.includes('.claude/history');
            console.log(chalk.gray(`Git ignore: ${hasGitignore ? 'Enabled' : 'Disabled'}`));
          }
        }
      } catch {
        // Not in a project
      }

      console.log();
    } catch (error) {
      console.error(
        chalk.red('Error checking status:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

program.parse();
