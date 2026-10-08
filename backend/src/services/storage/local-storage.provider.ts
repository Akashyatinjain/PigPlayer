import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AUDIO_DIR,
  ARTWORK_DIR,
  TEMP_DIR,
  ensureStorageDirectories,
  resolveSafeDataPath,
  toPosixRelative,
} from '../../config/paths';
import { config } from '../../config/env';

export interface StoredFile {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  size: number;
}

const AUDIO_SIGNATURES: Array<{ ext: string; check: (buf: Buffer) => boolean }> = [
  { ext: '.mp3', check: (b) => b.length > 2 && ((b[0] === 0xff && (b[1] & 0xe0) === 0xe0) || (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33)) },
  { ext: '.wav', check: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WAVE' },
  { ext: '.flac', check: (b) => b.length > 4 && b.toString('ascii', 0, 4) === 'fLaC' },
  { ext: '.ogg', check: (b) => b.length > 4 && b.toString('ascii', 0, 4) === 'OggS' },
  { ext: '.m4a', check: (b) => b.length > 8 && b.toString('ascii', 4, 8) === 'ftyp' },
  { ext: '.aac', check: (b) => b.length > 2 && ((b[0] === 0xff && (b[1] & 0xf0) === 0xf0) || (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33)) },
];

const ARTWORK_SIGNATURES: Array<{ ext: string; check: (buf: Buffer) => boolean }> = [
  { ext: '.jpg', check: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: '.png', check: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: '.webp', check: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { ext: '.gif', check: (b) => b.length > 6 && ['GIF87a', 'GIF89a'].includes(b.toString('ascii', 0, 6)) },
];

function randomId(): string {
  return crypto.randomBytes(8).toString('hex');
}

function getAudioExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export class LocalStorageProvider {
  constructor() {
    ensureStorageDirectories();
  }

  exists(relativeOrAbsolute: string): boolean {
    try {
      const absolute = resolveSafeDataPath(relativeOrAbsolute);
      return fs.existsSync(absolute);
    } catch {
      return false;
    }
  }

  getAudioPath(relativePath: string): string {
    return resolveSafeDataPath(relativePath);
  }

  getArtworkPath(relativePath: string): string {
    return resolveSafeDataPath(relativePath);
  }

  validateAudioBuffer(buffer: Buffer, filename: string): { ok: boolean; reason?: string; ext: string } {
    const ext = getAudioExtension(filename);
    if (!config.upload.allowedAudioExt.includes(ext as typeof config.upload.allowedAudioExt[number])) {
      return { ok: false, reason: `Unsupported audio format: ${ext || 'unknown'}`, ext };
    }

    const maxBytes = config.upload.maxFileSizeMb * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return { ok: false, reason: `File exceeds ${config.upload.maxFileSizeMb}MB limit`, ext };
    }

    if (buffer.length < 16) {
      return { ok: false, reason: 'File too small to be valid audio', ext };
    }

    const known = AUDIO_SIGNATURES.find((s) => s.ext === ext);
    if (known && !known.check(buffer)) {
      return { ok: false, reason: 'File signature does not match declared audio type', ext };
    }

    return { ok: true, ext };
  }

  validateArtworkBuffer(buffer: Buffer): { ok: boolean; ext: string } {
    const signature = ARTWORK_SIGNATURES.find((item) => item.check(buffer));
    return signature ? { ok: true, ext: signature.ext } : { ok: false, ext: '' };
  }

  private async writeAtomically(targetPath: string, buffer: Buffer): Promise<void> {
    const tempPath = path.join(TEMP_DIR, `upload_${randomId()}.part`);
    try {
      await fs.promises.writeFile(tempPath, buffer, { flag: 'wx' });
      await fs.promises.rename(tempPath, targetPath);
    } catch (error) {
      await fs.promises.unlink(tempPath).catch(() => undefined);
      throw error;
    }
  }

  async uploadAudio(buffer: Buffer, originalFilename: string): Promise<StoredFile> {
    const validation = this.validateAudioBuffer(buffer, originalFilename);
    if (!validation.ok) {
      throw new Error(validation.reason || 'Invalid audio file');
    }

    const fileName = `song_${Date.now()}_${randomId()}${validation.ext}`;
    const absolutePath = path.join(AUDIO_DIR, fileName);
    await this.writeAtomically(absolutePath, buffer);

    return {
      absolutePath,
      relativePath: toPosixRelative(absolutePath),
      fileName,
      size: buffer.length,
    };
  }

  async saveArtwork(buffer: Buffer, preferredExt = '.jpg'): Promise<StoredFile> {
    const validation = this.validateArtworkBuffer(buffer);
    if (!validation.ok) throw new Error('Artwork file signature is not a supported image format');
    const ext = validation.ext || preferredExt.toLowerCase();

    const fileName = `cover_${Date.now()}_${randomId()}${ext}`;
    const absolutePath = path.join(ARTWORK_DIR, fileName);
    await this.writeAtomically(absolutePath, buffer);

    return {
      absolutePath,
      relativePath: toPosixRelative(absolutePath),
      fileName,
      size: buffer.length,
    };
  }

  async deleteAudio(relativePath: string): Promise<boolean> {
    try {
      const absolute = resolveSafeDataPath(relativePath);
      if (fs.existsSync(absolute)) {
        await fs.promises.unlink(absolute);
      }
      return true;
    } catch {
      return false;
    }
  }

  async deleteArtwork(relativePath: string): Promise<boolean> {
    try {
      const absolute = resolveSafeDataPath(relativePath);
      if (fs.existsSync(absolute)) {
        await fs.promises.unlink(absolute);
      }
      return true;
    } catch {
      return false;
    }
  }

  async writeTemp(buffer: Buffer, filename: string): Promise<string> {
    ensureStorageDirectories();
    const safe = `tmp_${Date.now()}_${randomId()}_${path.basename(filename).replace(/[^\w.\-]/g, '_')}`;
    const absolute = path.join(TEMP_DIR, safe);
    await fs.promises.writeFile(absolute, buffer);
    return absolute;
  }

  async removeTemp(absolutePath: string): Promise<void> {
    try {
      const resolved = path.resolve(absolutePath);
      const relative = path.relative(TEMP_DIR, resolved);
      if (relative && !relative.startsWith('..') && !path.isAbsolute(relative) && fs.existsSync(resolved)) {
        await fs.promises.unlink(resolved);
      }
    } catch {
      // ignore
    }
  }

  async hashBuffer(buffer: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async hashFile(absolutePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(absolutePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}

export const localStorage = new LocalStorageProvider();
