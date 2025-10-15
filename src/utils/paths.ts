import { homedir, platform } from 'node:os';
import { join, resolve } from 'node:path';
import { access, constants } from 'node:fs/promises';

/**
 * Get the default global Claude Code storage path based on OS
 */
export function getGlobalStoragePath(): string {
  const home = homedir();
  // Claude Code stores projects in ~/.claude/projects
  return join(home, '.claude');
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

/**
 * Encode a project path to Claude Code's directory naming format
 * Claude Code stores projects in ~/.claude/projects/ with directory names like:
 * -Users-macbookair-Projects-myproject
 */
export function encodeProjectPath(projectPath: string): string {
  // Replace all slashes with dashes (including leading slash becomes leading dash)
  return projectPath.replace(/\//g, '-');
}

/**
 * Get the global project storage path for a specific project
 * Returns the path where Claude Code stores conversations for this project
 */
export function getGlobalProjectPath(globalStoragePath: string, projectRoot: string): string {
  const encoded = encodeProjectPath(projectRoot);
  return join(globalStoragePath, 'projects', encoded);
}
