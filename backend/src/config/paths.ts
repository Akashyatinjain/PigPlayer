import fs from 'fs';
import path from 'path';

function findProjectRoot(): string {
  const threeLevelsUp = path.resolve(__dirname, '../../../');
  if (fs.existsSync(path.join(threeLevelsUp, 'data')) || fs.existsSync(path.join(threeLevelsUp, 'frontend'))) {
    return threeLevelsUp;
  }
  const twoLevelsUp = path.resolve(__dirname, '../../');
  if (fs.existsSync(path.join(twoLevelsUp, 'data')) || fs.existsSync(path.join(twoLevelsUp, 'package.json'))) {
    return twoLevelsUp;
  }
  return threeLevelsUp;
}

/** Monorepo root or backend root */
export const PROJECT_ROOT = findProjectRoot();
export const DATA_ROOT = path.join(PROJECT_ROOT, 'data');
export const AUDIO_DIR = path.join(DATA_ROOT, 'audio');
export const ARTWORK_DIR = path.join(DATA_ROOT, 'artwork');
export const TEMP_DIR = path.join(DATA_ROOT, 'temp');
export const BACKUPS_DIR = path.join(DATA_ROOT, 'backups');
export const DB_PATH = path.join(DATA_ROOT, 'soundify.db');

const REQUIRED_DIRS = [DATA_ROOT, AUDIO_DIR, ARTWORK_DIR, TEMP_DIR, BACKUPS_DIR];

/**
 * Ensure local storage directories exist. Safe to call on every startup.
 */
export function ensureStorageDirectories(): void {
  for (const dir of REQUIRED_DIRS) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Resolve a relative storage path (e.g. audio/foo.mp3) to an absolute path
 * and verify it stays inside DATA_ROOT (path traversal protection).
 */
export function resolveSafeDataPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const absolute = path.resolve(DATA_ROOT, normalized);
  const dataRootResolved = path.resolve(DATA_ROOT);

  if (
    absolute !== dataRootResolved &&
    !absolute.startsWith(dataRootResolved + path.sep)
  ) {
    throw new Error('Path traversal blocked: path must remain inside data/');
  }

  return absolute;
}

export function toPosixRelative(absolutePath: string): string {
  const relative = path.relative(DATA_ROOT, absolutePath);
  return relative.split(path.sep).join('/');
}
