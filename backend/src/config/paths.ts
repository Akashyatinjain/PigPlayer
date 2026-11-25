import fs from 'fs';
import path from 'path';
import { databasePath, dataRoot, projectRoot } from '../../scripts/database-config';

/** Monorepo root or backend root */
export const PROJECT_ROOT = projectRoot;
export const DATA_ROOT = dataRoot;
export const AUDIO_DIR = path.join(DATA_ROOT, 'audio');
export const ARTWORK_DIR = path.join(DATA_ROOT, 'artwork');
export const TEMP_DIR = path.join(DATA_ROOT, 'temp');
export const BACKUPS_DIR = path.join(DATA_ROOT, 'backups');
export const DB_PATH = databasePath;

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

export function resolveMediaPath(relativePath: string, folder: 'audio' | 'artwork'): string {
  const logicalPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^uploads\//, '');
  const [top, ...segments] = logicalPath.split('/');
  if (top !== folder || !segments.length ||
      segments.some((segment) => !segment || segment === '.' || segment === '..' || /[:\0]/.test(segment))) {
    throw new Error('Media path must point inside its storage directory');
  }
  const absolute = resolveSafeDataPath(logicalPath);
  const canonicalRoot = fs.realpathSync(DATA_ROOT);
  const canonicalFolder = fs.realpathSync(path.join(DATA_ROOT, folder));
  if (path.relative(canonicalRoot, canonicalFolder) !== folder) {
    throw new Error('Invalid media storage directory');
  }
  if (fs.existsSync(absolute) &&
      path.relative(canonicalFolder, fs.realpathSync(absolute)) !== segments.join(path.sep)) {
    throw new Error('Symbolic links are not allowed in media paths');
  }
  return absolute;
}

export function toPosixRelative(absolutePath: string): string {
  const relative = path.relative(DATA_ROOT, absolutePath);
  return relative.split(path.sep).join('/');
}
