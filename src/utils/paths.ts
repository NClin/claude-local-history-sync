import { homedir, platform } from 'node:os';
import { join, resolve } from 'node:path';
import { access, constants } from 'node:fs/promises';

/**
 * Get the default global Claude Code storage path based on OS
 */
export function getGlobalStoragePath(): string {
  const home = homedir();
  const os = platform();

  switch (os) {
    case 'darwin': // macOS
      return join(home, 'Library', 'Application Support', 'Claude Code');
    case 'win32': // Windows
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Claude Code');
    case 'linux':
      return join(home, '.config', 'claude-code');
    default:
      // Fallback to Linux-style path
      return join(home, '.config', 'claude-code');
  }
}

/**
 * Get the local .claude directory path for a project
 */
export function getLocalStoragePath(projectRoot: string): string {
  return join(projectRoot, '.claude');
}

/**
 * Get the history subdirectory within a storage location
 */
export function getHistoryPath(storagePath: string): string {
  return join(storagePath, 'history');
}

/**
 * Check if a path exists and is accessible
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is writable
 */
export async function isWritable(path: string): Promise<boolean> {
  try {
    await access(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a path relative to the current working directory
 */
export function resolvePath(path: string): string {
  return resolve(process.cwd(), path);
}

/**
 * Normalize path separators for the current platform
 */
export function normalizePath(path: string): string {
  return resolve(path);
}
