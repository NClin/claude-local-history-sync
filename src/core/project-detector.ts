import { resolve } from 'node:path';
import type { ProjectInfo } from '../types/index.js';
import { getLocalStoragePath, getHistoryPath, pathExists } from '../utils/paths.js';
import { isGitRepository, getGitRoot } from '../utils/git.js';

/**
 * Detects project information and initialization status
 */
export class ProjectDetector {
  /**
   * Detect project information for a given directory
   */
  async detectProject(searchPath: string = process.cwd()): Promise<ProjectInfo> {
    const resolvedPath = resolve(searchPath);

    // Check if it's a git repository
    const isGit = await isGitRepository(resolvedPath);
    let root = resolvedPath;

    if (isGit) {
      const gitRoot = await getGitRoot(resolvedPath);
      if (gitRoot) {
        root = gitRoot;
      }
    }

    // Check for existing .claude directory
    const claudeDir = getLocalStoragePath(root);
    const claudeDirExists = await pathExists(claudeDir);

    // Check if local storage is properly initialized
    const historyPath = getHistoryPath(claudeDir);
    const hasLocalStorage = await pathExists(historyPath);

    return {
      root,
      isGitRepo: isGit,
      claudeDir: claudeDirExists ? claudeDir : undefined,
      hasLocalStorage,
    };
  }

  /**
   * Find the nearest project root by traversing up the directory tree
   */
  async findProjectRoot(startPath: string = process.cwd()): Promise<string> {
    const isGit = await isGitRepository(startPath);

    if (isGit) {
      const gitRoot = await getGitRoot(startPath);
      if (gitRoot) {
        return gitRoot;
      }
    }

    // Fall back to current directory if no git root found
    return resolve(startPath);
  }

  /**
   * Check if a directory has local storage initialized
   */
  async hasLocalStorage(projectRoot: string): Promise<boolean> {
    const historyPath = getHistoryPath(getLocalStoragePath(projectRoot));
    return pathExists(historyPath);
  }

  /**
   * Validate that a project is suitable for local storage
   */
  async validateProject(projectRoot: string): Promise<{
    valid: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    // Check if directory exists
    if (!(await pathExists(projectRoot))) {
      reasons.push('Project directory does not exist');
      return { valid: false, reasons };
    }

    // Warn if not a git repository (but still allow it)
    const isGit = await isGitRepository(projectRoot);
    if (!isGit) {
      reasons.push(
        'Not a git repository - consider initializing git for better project tracking'
      );
    }

    return {
      valid: true,
      reasons,
    };
  }
}
