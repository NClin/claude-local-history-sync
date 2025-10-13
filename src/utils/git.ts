import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { pathExists } from './paths.js';

const execAsync = promisify(exec);

/**
 * Check if a directory is a git repository
 */
export async function isGitRepository(path: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync('git rev-parse --is-inside-work-tree', {
      cwd: path,
    });
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}

/**
 * Get the root directory of a git repository
 */
export async function getGitRoot(path: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync('git rev-parse --show-toplevel', {
      cwd: path,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Add entries to .gitignore if they don't already exist
 */
export async function updateGitignore(
  projectRoot: string,
  entries: string[]
): Promise<void> {
  const gitignorePath = join(projectRoot, '.gitignore');
  const exists = await pathExists(gitignorePath);

  let content = '';
  if (exists) {
    content = await readFile(gitignorePath, 'utf-8');
  }

  const lines = content.split('\n').map((line) => line.trim());
  const newEntries: string[] = [];

  for (const entry of entries) {
    if (!lines.includes(entry) && !lines.includes(entry.replace(/^\//, ''))) {
      newEntries.push(entry);
    }
  }

  if (newEntries.length > 0) {
    const separator = content.endsWith('\n') || content === '' ? '' : '\n';
    const header = '\n# Claude Code local storage\n';
    const additions = newEntries.join('\n') + '\n';

    if (exists) {
      await appendFile(gitignorePath, separator + header + additions);
    } else {
      await writeFile(gitignorePath, header.trimStart() + additions);
    }
  }
}

/**
 * Get recommended .gitignore entries for Claude Code local storage
 * By default, we don't add any entries to respect user privacy settings
 * Users can manually add .claude/history/ to git if they want to commit it
 */
export function getRecommendedGitignoreEntries(): string[] {
  return [];
}

/**
 * Check if a file is ignored by git
 */
export async function isGitIgnored(
  filePath: string,
  projectRoot: string
): Promise<boolean> {
  try {
    await execAsync(`git check-ignore "${filePath}"`, {
      cwd: projectRoot,
    });
    return true;
  } catch {
    return false;
  }
}
