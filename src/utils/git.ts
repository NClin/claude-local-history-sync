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
 * Remove entries from .gitignore
 */
export async function removeFromGitignore(
  projectRoot: string,
  entries: string[]
): Promise<void> {
  const gitignorePath = join(projectRoot, '.gitignore');
  const exists = await pathExists(gitignorePath);

  if (!exists) {
    return; // Nothing to remove
  }

  const content = await readFile(gitignorePath, 'utf-8');
  const lines = content.split('\n');

  // Remove the specified entries and the Claude Code header
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed === '# Claude Code local storage') {
      return false;
    }
    return !entries.some(entry => trimmed === entry || trimmed === entry.replace(/^\//, ''));
  });

  // Remove consecutive empty lines
  const cleanedLines: string[] = [];
  let previousEmpty = false;
  for (const line of filteredLines) {
    const isEmpty = line.trim() === '';
    if (isEmpty && previousEmpty) {
      continue;
    }
    cleanedLines.push(line);
    previousEmpty = isEmpty;
  }

  // Write back, ensuring file ends with newline
  let newContent = cleanedLines.join('\n');
  if (newContent && !newContent.endsWith('\n')) {
    newContent += '\n';
  }

  await writeFile(gitignorePath, newContent);
}

/**
 * Get recommended .gitignore entries for Claude Code local storage
 */
export function getRecommendedGitignoreEntries(): string[] {
  return [
    '/.claude/history/',
    '/.claude/*.log',
    '/.claude/cache/',
  ];
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
