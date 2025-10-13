import { mkdir, readdir, copyFile, stat, rm } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type {
  StorageLocation,
  SyncResult,
  ConversationMetadata,
} from '../types/index.js';
import {
  getGlobalStoragePath,
  getLocalStoragePath,
  getHistoryPath,
  pathExists,
  isWritable,
} from '../utils/paths.js';

/**
 * Manages conversation history storage across global and local locations
 */
export class StorageManager {
  private globalPath: string;
  private localPath: string | null = null;

  constructor(globalPath?: string) {
    this.globalPath = globalPath || getGlobalStoragePath();
  }

  /**
   * Initialize local storage for a project
   */
  async initializeLocalStorage(projectRoot: string): Promise<void> {
    this.localPath = getLocalStoragePath(projectRoot);
    const historyPath = getHistoryPath(this.localPath);

    // Create .claude/history directory structure
    await mkdir(historyPath, { recursive: true });

    // Create a README to explain the directory
    const readmePath = join(this.localPath, 'README.md');
    const readmeContent = `# Claude Sync - Local Conversation History

This directory contains local conversation history for this project.

## Structure

- \`history/\`: Conversation history files (.jsonl format)
- \`config.json\`: Local configuration (if present)

## Git Integration

By default, \`.claude/history/\` is **not** gitignored, allowing you to commit and share conversation history with your team.

### To Keep History Private

Add to your \`.gitignore\`:
\`\`\`
/.claude/history/
\`\`\`

### To Share History with Team

Simply commit the \`.claude/\` directory:
\`\`\`bash
git add .claude/
git commit -m "Add conversation history"
\`\`\`

Team members can then run \`claude-sync sync\` or \`/sync daemon start\` to make conversations available in Claude Code.

## Management

Use \`claude-sync\` to manage local storage:

- \`claude-sync sync\`: Sync conversations (auto-initializes)
- \`claude-sync daemon start\`: Auto-sync all projects
- \`claude-sync daemon status\`: Check daemon status

Or use slash commands in Claude Code:
- \`/sync status\`: Check sync status
- \`/sync daemon start\`: Start background daemon
`;

    const { writeFile } = await import('node:fs/promises');
    await writeFile(readmePath, readmeContent);
  }

  /**
   * Get storage location information
   */
  async getStorageLocations(
    projectRoot?: string
  ): Promise<{ global: StorageLocation; local: StorageLocation | null }> {
    const globalHistoryPath = getHistoryPath(this.globalPath);
    const globalExists = await pathExists(globalHistoryPath);

    const result: {
      global: StorageLocation;
      local: StorageLocation | null;
    } = {
      global: {
        path: globalHistoryPath,
        type: 'global',
        exists: globalExists,
      },
      local: null,
    };

    if (projectRoot) {
      const localPath = getLocalStoragePath(projectRoot);
      const localHistoryPath = getHistoryPath(localPath);
      const localExists = await pathExists(localHistoryPath);

      result.local = {
        path: localHistoryPath,
        type: 'local',
        exists: localExists,
      };
    }

    return result;
  }

  /**
   * Sync conversations from global to local storage
   */
  async syncToLocal(
    projectRoot: string,
    options: { bidirectional?: boolean } = {}
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: Error[] = [];
    let filesProcessed = 0;

    try {
      const localPath = getLocalStoragePath(projectRoot);
      const localHistoryPath = getHistoryPath(localPath);
      const globalHistoryPath = getHistoryPath(this.globalPath);

      // Ensure local storage is initialized
      if (!(await pathExists(localHistoryPath))) {
        await this.initializeLocalStorage(projectRoot);
      }

      // Check if global storage exists
      if (!(await pathExists(globalHistoryPath))) {
        return {
          success: true,
          filesProcessed: 0,
          errors: [],
          duration: Date.now() - startTime,
        };
      }

      // Get conversation files from global storage
      const files = await this.getConversationFiles(globalHistoryPath);

      // Filter files that belong to this project
      const projectFiles = await this.filterProjectFiles(
        files,
        projectRoot,
        globalHistoryPath
      );

      // Copy files to local storage
      for (const file of projectFiles) {
        try {
          const sourcePath = join(globalHistoryPath, file);
          const destPath = join(localHistoryPath, file);
          await copyFile(sourcePath, destPath);
          filesProcessed++;
        } catch (error) {
          errors.push(
            error instanceof Error
              ? error
              : new Error(`Failed to copy ${file}`)
          );
        }
      }

      // Bidirectional sync: also copy local files to global
      if (options.bidirectional) {
        const localFiles = await this.getConversationFiles(localHistoryPath);
        for (const file of localFiles) {
          try {
            const sourcePath = join(localHistoryPath, file);
            const destPath = join(globalHistoryPath, file);
            // Only copy if file doesn't exist in global or is newer
            const shouldCopy = await this.shouldCopyFile(
              sourcePath,
              destPath
            );
            if (shouldCopy) {
              await copyFile(sourcePath, destPath);
              filesProcessed++;
            }
          } catch (error) {
            errors.push(
              error instanceof Error
                ? error
                : new Error(`Failed to copy ${file} to global`)
            );
          }
        }
      }

      return {
        success: errors.length === 0,
        filesProcessed,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error
          : new Error('Sync failed')
      );
      return {
        success: false,
        filesProcessed,
        errors,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Sync conversations from local to global storage (reverse sync)
   * This makes local conversations available in Claude Code
   */
  async syncToGlobal(projectRoot: string): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: Error[] = [];
    let filesProcessed = 0;

    try {
      const localPath = getLocalStoragePath(projectRoot);
      const localHistoryPath = getHistoryPath(localPath);
      const globalHistoryPath = getHistoryPath(this.globalPath);

      // Check if local storage exists
      if (!(await pathExists(localHistoryPath))) {
        return {
          success: false,
          filesProcessed: 0,
          errors: [new Error('Local storage not initialized')],
          duration: Date.now() - startTime,
        };
      }

      // Ensure global storage directory exists
      await mkdir(globalHistoryPath, { recursive: true });

      // Get all conversation files from local storage
      const localFiles = await this.getConversationFiles(localHistoryPath);

      // Copy all files to global storage
      for (const file of localFiles) {
        try {
          const sourcePath = join(localHistoryPath, file);
          const destPath = join(globalHistoryPath, file);

          // Always copy to ensure global has latest version
          await copyFile(sourcePath, destPath);
          filesProcessed++;
        } catch (error) {
          errors.push(
            error instanceof Error
              ? error
              : new Error(`Failed to copy ${file} to global`)
          );
        }
      }

      return {
        success: errors.length === 0,
        filesProcessed,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error
          : new Error('Reverse sync failed')
      );
      return {
        success: false,
        filesProcessed,
        errors,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get all conversation files in a directory
   */
  private async getConversationFiles(directoryPath: string): Promise<string[]> {
    try {
      const entries = await readdir(directoryPath, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => entry.name);
    } catch {
      return [];
    }
  }

  /**
   * Filter conversation files that belong to a specific project
   * This is a heuristic - actual implementation may need to parse file contents
   */
  private async filterProjectFiles(
    files: string[],
    projectRoot: string,
    historyPath: string
  ): Promise<string[]> {
    const projectFiles: string[] = [];

    for (const file of files) {
      try {
        const filePath = join(historyPath, file);
        const { readFile } = await import('node:fs/promises');
        const content = await readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        // Check if conversation mentions this project path
        // This is a simple heuristic - may need refinement
        if (
          data.workingDirectory === projectRoot ||
          data.cwd === projectRoot ||
          JSON.stringify(data).includes(projectRoot)
        ) {
          projectFiles.push(file);
        }
      } catch {
        // Skip files that can't be parsed
        continue;
      }
    }

    return projectFiles;
  }

  /**
   * Determine if a file should be copied (based on modification time)
   */
  private async shouldCopyFile(
    sourcePath: string,
    destPath: string
  ): Promise<boolean> {
    try {
      const destExists = await pathExists(destPath);
      if (!destExists) {
        return true;
      }

      const sourceStat = await stat(sourcePath);
      const destStat = await stat(destPath);

      return sourceStat.mtime > destStat.mtime;
    } catch {
      return true;
    }
  }

  /**
   * Clean up local storage (optionally preserving configuration)
   */
  async cleanLocalStorage(
    projectRoot: string,
    options: { preserveConfig?: boolean } = {}
  ): Promise<void> {
    const localPath = getLocalStoragePath(projectRoot);
    const historyPath = getHistoryPath(localPath);

    if (await pathExists(historyPath)) {
      await rm(historyPath, { recursive: true, force: true });
    }

    if (!options.preserveConfig && (await pathExists(localPath))) {
      await rm(localPath, { recursive: true, force: true });
    }
  }

  /**
   * Get metadata for conversations in a storage location
   */
  async getConversationMetadata(
    storagePath: string
  ): Promise<ConversationMetadata[]> {
    const historyPath = getHistoryPath(storagePath);
    const files = await this.getConversationFiles(historyPath);
    const metadata: ConversationMetadata[] = [];

    for (const file of files) {
      try {
        const filePath = join(historyPath, file);
        const { readFile } = await import('node:fs/promises');
        const content = await readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        const fileStat = await stat(filePath);

        metadata.push({
          id: basename(file, '.json'),
          projectPath: data.workingDirectory || data.cwd || 'unknown',
          createdAt: fileStat.birthtime.toISOString(),
          updatedAt: fileStat.mtime.toISOString(),
          messageCount: data.messages?.length || 0,
          title: data.title || undefined,
        });
      } catch {
        // Skip files that can't be parsed
        continue;
      }
    }

    return metadata;
  }
}
