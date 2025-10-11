#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { StorageManager } from './core/storage-manager.js';
import { ProjectDetector } from './core/project-detector.js';
import { ConfigManager } from './core/config-manager.js';
import { HistoryWatcher } from './core/watcher.js';
import { updateGitignore, getRecommendedGitignoreEntries } from './utils/git.js';
import type { StorageMode } from './types/index.js';

const program = new Command();
const configManager = new ConfigManager();
const projectDetector = new ProjectDetector();

program
  .name('claude-local')
  .description('Local conversation history storage for Claude Code')
  .version('0.1.0');

/**
 * Initialize local storage for the current project
 */
program
  .command('init')
  .description('Initialize local storage in the current project')
  .option('--no-gitignore', 'Skip adding .gitignore entries')
  .option('--force', 'Re-initialize even if already set up')
  .action(async (options) => {
    try {
      const project = await projectDetector.detectProject();

      if (project.hasLocalStorage && !options.force) {
        console.log(chalk.yellow('Local storage is already initialized.'));
        console.log(chalk.gray(`Location: ${project.claudeDir}`));
        console.log(
          chalk.gray('Use --force to re-initialize')
        );
        return;
      }

      console.log(chalk.blue('Initializing local storage...'));
      console.log(chalk.gray(`Project root: ${project.root}`));

      const storageManager = new StorageManager(
        configManager.getGlobalStoragePath()
      );

      await storageManager.initializeLocalStorage(project.root);

      console.log(chalk.green('✓ Local storage initialized'));

      // Add .gitignore entries if requested
      if (options.gitignore && project.isGitRepo) {
        console.log(chalk.blue('Updating .gitignore...'));
        await updateGitignore(
          project.root,
          getRecommendedGitignoreEntries()
        );
        console.log(chalk.green('✓ .gitignore updated'));
      }

      // Offer to sync existing conversations
      console.log(
        chalk.yellow(
          '\nRun `claude-local sync` to import existing conversations'
        )
      );
    } catch (error) {
      console.error(
        chalk.red('Error initializing local storage:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

/**
 * Sync conversations between global and local storage
 */
program
  .command('sync')
  .description('Sync conversations between global and local storage')
  .option('--from-global', 'Sync from global to local (default)')
  .option('--bidirectional', 'Sync in both directions')
  .option('--dry-run', 'Show what would be synced without syncing')
  .action(async (options) => {
    try {
      const project = await projectDetector.detectProject();

      if (!project.hasLocalStorage) {
        console.log(
          chalk.yellow('Local storage is not initialized.')
        );
        console.log(chalk.gray('Run `claude-local init` first'));
        return;
      }

      const storageManager = new StorageManager(
        configManager.getGlobalStoragePath()
      );

      console.log(chalk.blue('Syncing conversations...'));

      if (options.dryRun) {
        console.log(chalk.gray('(Dry run - no files will be modified)'));
        // In a real implementation, we'd show what would be synced
        return;
      }

      const result = await storageManager.syncToLocal(project.root, {
        bidirectional: options.bidirectional,
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
 * Watch for changes and auto-sync
 */
program
  .command('watch')
  .description('Watch for changes and automatically sync')
  .option('--bidirectional', 'Sync in both directions')
  .action(async (options) => {
    try {
      const project = await projectDetector.detectProject();

      if (!project.hasLocalStorage) {
        console.log(
          chalk.yellow('Local storage is not initialized.')
        );
        console.log(chalk.gray('Run `claude-local init` first'));
        return;
      }

      const storageManager = new StorageManager(
        configManager.getGlobalStoragePath()
      );
      const watcher = new HistoryWatcher(storageManager);

      console.log(chalk.blue('Starting file watcher...'));
      console.log(chalk.gray(`Watching: ${configManager.getGlobalStoragePath()}`));
      console.log(chalk.gray('Press Ctrl+C to stop'));

      watcher.on((event) => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        console.log(
          chalk.gray(`[${time}] ${event.type}: ${event.path}`)
        );
      });

      await watcher.startWatching(
        configManager.getGlobalStoragePath(),
        project.root,
        {
          bidirectional: options.bidirectional,
        }
      );

      // Keep the process running
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\nStopping watcher...'));
        await watcher.stopWatching();
        process.exit(0);
      });
    } catch (error) {
      console.error(
        chalk.red('Error starting watcher:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

/**
 * Show status of local storage
 */
program
  .command('status')
  .description('Show status of local and global storage')
  .action(async () => {
    try {
      const project = await projectDetector.detectProject();
      const storageManager = new StorageManager(
        configManager.getGlobalStoragePath()
      );

      console.log(chalk.bold('\nProject Information:'));
      console.log(`  Root: ${project.root}`);
      console.log(`  Git repository: ${project.isGitRepo ? 'Yes' : 'No'}`);
      console.log(
        `  Local storage: ${project.hasLocalStorage ? chalk.green('Initialized') : chalk.yellow('Not initialized')}`
      );

      console.log(chalk.bold('\nConfiguration:'));
      const config = configManager.getConfig();
      console.log(`  Mode: ${config.mode}`);
      console.log(`  Auto-sync: ${config.autoSync ? 'Enabled' : 'Disabled'}`);
      console.log(
        `  Auto-gitignore: ${config.autoGitignore ? 'Enabled' : 'Disabled'}`
      );

      const locations = await storageManager.getStorageLocations(
        project.root
      );

      console.log(chalk.bold('\nStorage Locations:'));
      console.log(
        `  Global: ${locations.global.exists ? chalk.green('✓') : chalk.red('✗')} ${locations.global.path}`
      );
      if (locations.local) {
        console.log(
          `  Local:  ${locations.local.exists ? chalk.green('✓') : chalk.red('✗')} ${locations.local.path}`
        );
      }

      if (project.hasLocalStorage) {
        const metadata = await storageManager.getConversationMetadata(
          project.root
        );
        console.log(
          chalk.bold(`\nLocal Conversations: ${metadata.length}`)
        );
        if (metadata.length > 0) {
          metadata.slice(0, 5).forEach((conv) => {
            console.log(
              chalk.gray(
                `  - ${conv.id} (${conv.messageCount} messages, updated ${new Date(conv.updatedAt).toLocaleDateString()})`
              )
            );
          });
          if (metadata.length > 5) {
            console.log(chalk.gray(`  ... and ${metadata.length - 5} more`));
          }
        }
      }
    } catch (error) {
      console.error(
        chalk.red('Error getting status:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

/**
 * Configuration commands
 */
const configCommand = program
  .command('config')
  .description('Manage configuration');

configCommand
  .command('set-mode <mode>')
  .description('Set storage mode (global, local, or hybrid)')
  .action((mode: string) => {
    if (!['global', 'local', 'hybrid'].includes(mode)) {
      console.error(chalk.red('Invalid mode. Must be: global, local, or hybrid'));
      process.exit(1);
    }
    configManager.setMode(mode as StorageMode);
    console.log(chalk.green(`✓ Storage mode set to: ${mode}`));
  });

configCommand
  .command('set-global-path <path>')
  .description('Set custom global storage path')
  .action((path: string) => {
    configManager.setGlobalStoragePath(path);
    console.log(chalk.green(`✓ Global storage path set to: ${path}`));
  });

configCommand
  .command('auto-sync <enabled>')
  .description('Enable or disable auto-sync (true/false)')
  .action((enabled: string) => {
    const isEnabled = enabled.toLowerCase() === 'true';
    configManager.setAutoSync(isEnabled);
    console.log(
      chalk.green(`✓ Auto-sync ${isEnabled ? 'enabled' : 'disabled'}`)
    );
  });

configCommand
  .command('show')
  .description('Show current configuration')
  .action(() => {
    const config = configManager.getConfig();
    console.log(chalk.bold('Configuration:'));
    console.log(JSON.stringify(config, null, 2));
    console.log(chalk.gray(`\nConfig file: ${configManager.getConfigPath()}`));
  });

configCommand
  .command('reset')
  .description('Reset configuration to defaults')
  .action(() => {
    configManager.reset();
    console.log(chalk.green('✓ Configuration reset to defaults'));
  });

program.parse();
