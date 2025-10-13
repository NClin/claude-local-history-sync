#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { StorageManager } from './core/storage-manager.js';
import { ProjectDetector } from './core/project-detector.js';
import { ConfigManager } from './core/config-manager.js';
import { SyncDaemon } from './core/daemon.js';
import { updateGitignore, getRecommendedGitignoreEntries } from './utils/git.js';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const program = new Command();
const configManager = new ConfigManager();
const projectDetector = new ProjectDetector();

program
  .name('claude-local')
  .description('Automatic conversation sync for Claude Code - stores conversations in project .claude folders')
  .version('0.1.0');

/**
 * Sync conversations bidirectionally between global and local storage
 * Auto-initializes if needed
 */
program
  .command('sync')
  .description('Sync all conversations (bidirectionally, auto-initializes if needed)')
  .action(async () => {
    try {
      const project = await projectDetector.detectProject();
      const storageManager = new StorageManager(
        configManager.getGlobalStoragePath()
      );

      // Auto-initialize if needed
      if (!project.hasLocalStorage) {
        console.log(chalk.blue('Initializing local storage...'));
        console.log(chalk.gray(`Project root: ${project.root}`));

        await storageManager.initializeLocalStorage(project.root);
        console.log(chalk.green('✓ Local storage initialized'));

        // Add .gitignore entries if this is a git repo
        if (project.isGitRepo) {
          console.log(chalk.blue('Updating .gitignore...'));
          await updateGitignore(
            project.root,
            getRecommendedGitignoreEntries()
          );
          console.log(chalk.green('✓ .gitignore updated'));
        }
      }

      // Always do bidirectional sync
      console.log(chalk.blue('Syncing conversations (bidirectional)...'));

      const result = await storageManager.syncToLocal(project.root, {
        bidirectional: true,
      });

      if (result.success) {
        console.log(
          chalk.green(
            `✓ Synced ${result.filesProcessed} conversation(s) in ${result.duration}ms`
          )
        );
      } else {
        console.log(
          chalk.yellow(
            `⚠ Sync completed with ${result.errors.length} error(s)`
          )
        );
        result.errors.forEach((error) => {
          console.error(chalk.red(`  - ${error.message}`));
        });
      }
    } catch (error) {
      console.error(
        chalk.red('Error syncing conversations:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

/**
 * Daemon commands for automatic background sync
 */
const daemonCommand = program
  .command('daemon')
  .description('Manage automatic background sync daemon');

daemonCommand
  .command('start')
  .description('Start automatic background sync')
  .option('--paths <paths...>', 'Custom paths to monitor (default: ~/Projects, ~/code, ~/src)')
  .action(async (options) => {
    try {
      const pidFile = join(homedir(), '.claude-local-daemon.pid');

      // Check if already running
      try {
        const pid = await readFile(pidFile, 'utf-8');
        console.log(chalk.yellow(`Daemon already running (PID: ${pid})`));
        console.log(chalk.gray('Use `claude-local daemon stop` to stop it'));
        return;
      } catch {
        // Not running, continue
      }

      console.log(chalk.blue('Starting automatic sync daemon...'));

      const searchPaths = options.paths || [
        join(homedir(), 'Projects'),
        join(homedir(), 'code'),
        join(homedir(), 'src'),
      ];

      console.log(chalk.gray(`Monitoring paths:`));
      searchPaths.forEach((p: string) => console.log(chalk.gray(`  - ${p}`)));

      const daemon = new SyncDaemon(searchPaths);
      await daemon.start();

      // Save PID
      await writeFile(pidFile, process.pid.toString());

      console.log(chalk.green('✓ Daemon started'));
      console.log(chalk.gray('\nAutomatically syncing all conversations in discovered projects'));
      console.log(chalk.gray('Press Ctrl+C or use `claude-local daemon stop` to stop'));

      // Keep process running
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\nStopping daemon...'));
        await daemon.stop();
        await unlink(pidFile).catch(() => {});
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        await daemon.stop();
        await unlink(pidFile).catch(() => {});
        process.exit(0);
      });
    } catch (error) {
      console.error(
        chalk.red('Error starting daemon:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

daemonCommand
  .command('stop')
  .description('Stop automatic background sync')
  .action(async () => {
    try {
      const pidFile = join(homedir(), '.claude-local-daemon.pid');

      try {
        const pid = await readFile(pidFile, 'utf-8');
        console.log(chalk.blue(`Stopping daemon (PID: ${pid})...`));

        // Send SIGTERM to daemon
        process.kill(parseInt(pid), 'SIGTERM');

        // Wait a moment then remove PID file
        setTimeout(async () => {
          await unlink(pidFile).catch(() => {});
          console.log(chalk.green('✓ Daemon stopped'));
        }, 1000);
      } catch {
        console.log(chalk.yellow('Daemon is not running'));
      }
    } catch (error) {
      console.error(
        chalk.red('Error stopping daemon:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

program.parse();
