import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { SongService } from './song.service';
import { StorageService } from './storage.service';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { PROJECT_ROOT, DATA_ROOT } from '../config/paths';

const MIME_BY_EXT: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

/**
 * Fast in-memory cache of audio files in data/audio by title/keywords
 */
let audioDirFileCache: Array<{ filename: string; path: string; titleHints: string[] }> | null = null;
let lastAudioScanTime = 0;

function scanAudioDirectory(): Array<{ filename: string; path: string; titleHints: string[] }> {
  const now = Date.now();
  if (audioDirFileCache && now - lastAudioScanTime < 30000) {
    return audioDirFileCache;
  }

  const audioDir = path.join(DATA_ROOT, 'audio');
  const results: Array<{ filename: string; path: string; titleHints: string[] }> = [];
  if (!fs.existsSync(audioDir)) return results;

  try {
    const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.m4a'));
    for (const f of files) {
      const fullPath = path.join(audioDir, f);
      const hints: string[] = [f.toLowerCase()];
      try {
        // Read first 2KB for ID3 title strings
        const buf = Buffer.alloc(2048);
        const fd = fs.openSync(fullPath, 'r');
        fs.readSync(fd, buf, 0, 2048, 0);
        fs.closeSync(fd);
        const text = buf.toString('latin1').toLowerCase();
        hints.push(text);
      } catch {
        // ignore read error
      }
      results.push({ filename: f, path: fullPath, titleHints: hints });
    }
    audioDirFileCache = results;
    lastAudioScanTime = now;
  } catch {
    // ignore
  }

  return results;
}

/**
 * Locate audio files prioritizing local storage and content matching before falling back to demo.
 */
function findAudioFallbackPath(song: {
  audioRelativePath?: string | null;
  audioFileName?: string | null;
  originalFileName?: string | null;
  title?: string;
  artist?: string;
}): string | null {
  const audioDir = path.join(DATA_ROOT, 'audio');

  // 1. Direct candidate paths inside DATA_ROOT/audio
  if (song.audioRelativePath) {
    const direct = path.join(DATA_ROOT, song.audioRelativePath.replace(/^[/\\]+/, ''));
    if (fs.existsSync(direct)) return direct;
    const inAudio = path.join(audioDir, path.basename(song.audioRelativePath));
    if (fs.existsSync(inAudio)) return inAudio;
  }

  if (song.audioFileName) {
    const inAudio = path.join(audioDir, path.basename(song.audioFileName));
    if (fs.existsSync(inAudio)) return inAudio;
  }

  if (song.originalFileName) {
    const inAudio = path.join(audioDir, path.basename(song.originalFileName));
    if (fs.existsSync(inAudio)) return inAudio;
  }

  // 2. Scan DATA_ROOT/audio for matching track title or artist
  const scanned = scanAudioDirectory();
  if (song.title && scanned.length > 0) {
    const cleanTitle = song.title.toLowerCase().replace(/[-_()]+/g, ' ').trim();
    const titleKeywords = cleanTitle.split(/\s+/).filter(w => w.length > 2 && !['pagalnew', 'audio', 'song'].includes(w));

    // Try exact or high keyword match
    for (const item of scanned) {
      const allText = item.titleHints.join(' ');
      if (titleKeywords.length > 0 && titleKeywords.every(kw => allText.includes(kw))) {
        return item.path;
      }
    }

    // Try at least primary keyword match
    if (titleKeywords.length > 0) {
      const primary = titleKeywords[0];
      for (const item of scanned) {
        if (item.titleHints.some(h => h.includes(primary))) {
          return item.path;
        }
      }
    }
  }

  // 3. Demo directory specific title matches (e.g. "Midnight Drift" -> "midnight-drift.wav")
  const demoDirs = [
    path.join(PROJECT_ROOT, 'backend/public/demo'),
    path.join(PROJECT_ROOT, 'frontend/public/demo'),
    path.join(__dirname, '../../public/demo'),
  ];

  if (song.title) {
    const slug = song.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    for (const dir of demoDirs) {
      if (!fs.existsSync(dir)) continue;
      for (const ext of ['.wav', '.mp3']) {
        const candidate = path.join(dir, `${slug}${ext}`);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }

  // 4. Any song in data/audio if available
  if (scanned.length > 0) {
    return scanned[0].path;
  }

  // 5. Fallback demo track
  for (const dir of demoDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.wav') || f.endsWith('.mp3'));
      if (files.length > 0) {
        return path.join(dir, files[0]);
      }
    } catch {}
  }

  return null;
}

/**
 * Locate artwork prioritizing local artwork folder before falling back to demo SVG.
 */
function findArtworkFallbackPath(song: {
  coverRelativePath?: string | null;
  coverFileName?: string | null;
  title?: string;
}): string | null {
  const artworkDir = path.join(DATA_ROOT, 'artwork');

  if (song.coverRelativePath) {
    const direct = path.join(DATA_ROOT, song.coverRelativePath.replace(/^[/\\]+/, ''));
    if (fs.existsSync(direct)) return direct;
    const inArtwork = path.join(artworkDir, path.basename(song.coverRelativePath));
    if (fs.existsSync(inArtwork)) return inArtwork;
  }

  if (song.coverFileName) {
    const inArtwork = path.join(artworkDir, path.basename(song.coverFileName));
    if (fs.existsSync(inArtwork)) return inArtwork;
  }

  // Check demo covers
  const demoCovers = [
    path.join(PROJECT_ROOT, 'backend/public/demo/covers'),
    path.join(PROJECT_ROOT, 'frontend/public/demo/covers'),
    path.join(__dirname, '../../public/demo/covers'),
  ];

  for (const dir of demoCovers) {
    if (!fs.existsSync(dir)) continue;
    try {
      const covers = fs.readdirSync(dir).filter(f => f.endsWith('.svg') || f.endsWith('.jpg') || f.endsWith('.png'));
      if (covers.length > 0) {
        return path.join(dir, covers[0]);
      }
    } catch {}
  }

  return null;
}

/**
 * Stream a local file with robust HTTP Range support (RFC 7233).
 * Properly cleans up streams on client abort / seek to prevent ERR_STREAM_PREMATURE_CLOSE.
 */
export function streamFileWithRange(
  req: Request,
  res: Response,
  absolutePath: string,
  mimeType: string,
  downloadName?: string
): void {
  if (!fs.existsSync(absolutePath)) {
    throw new AppError('Media file not found on disk', 404);
  }

  const stat = fs.statSync(absolutePath);
  const fileSize = stat.size;
  const rangeHeader = req.headers.range;

  if (downloadName) {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    );
  }

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', mimeType);
  // Cache static audio files aggressively to enable browser audio pre-buffering
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  if (rangeHeader) {
    const rawRange = rangeHeader.replace(/bytes=/, '').trim();
    const parts = rawRange.split('-');

    let start: number;
    let end: number;

    if (parts[0] === '' && parts[1]) {
      // Suffix range: bytes=-500 (last 500 bytes)
      const suffix = parseInt(parts[1], 10);
      start = Math.max(0, fileSize - suffix);
      end = fileSize - 1;
    } else {
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    }

    // Clamp end to file size per RFC 7233
    if (end >= fileSize) {
      end = fileSize - 1;
    }

    if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || start > end || start >= fileSize) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      res.end();
      return;
    }

    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunkSize);

    const stream = fs.createReadStream(absolutePath, { start, end });

    const cleanup = () => {
      if (!stream.destroyed) {
        stream.destroy();
      }
    };
    req.on('close', cleanup);
    res.on('close', cleanup);
    res.on('finish', cleanup);

    stream.on('error', (err) => {
      cleanup();
      logger.error('Audio stream range error', err.message);
      if (!res.headersSent) res.status(500).end();
      else res.destroy();
    });

    stream.pipe(res);
    return;
  }

  res.status(200);
  res.setHeader('Content-Length', fileSize);
  const stream = fs.createReadStream(absolutePath);

  const cleanup = () => {
    if (!stream.destroyed) {
      stream.destroy();
    }
  };
  req.on('close', cleanup);
  res.on('close', cleanup);
  res.on('finish', cleanup);

  stream.on('error', (err) => {
    cleanup();
    logger.error('Audio stream error', err.message);
    if (!res.headersSent) res.status(500).end();
    else res.destroy();
  });

  stream.pipe(res);
}

export class MediaService {
  static async streamAudio(req: Request, res: Response) {
    const song = await SongService.getSongRaw(req.params.id as string);
    if (!song) {
      throw new AppError('Song not found', 404);
    }

    // 1. If remote audio URL exists (Cloudinary, external CDN, S3), redirect
    if (song.audioUrl && (song.audioUrl.startsWith('http://') || song.audioUrl.startsWith('https://'))) {
      return res.redirect(song.audioUrl);
    }

    // 2. Check local disk path
    if (song.audioRelativePath) {
      const absolutePath = StorageService.getAudioAbsolutePath(song.audioRelativePath);
      if (fs.existsSync(absolutePath)) {
        const ext = path.extname(absolutePath).toLowerCase();
        const mime = song.mimeType || MIME_BY_EXT[ext] || 'audio/mpeg';
        return streamFileWithRange(req, res, absolutePath, mime);
      }
    }

    // 3. Check demo / fallback audio files (especially on Render ephemeral containers)
    const fallbackAudio = findAudioFallbackPath(song);
    if (fallbackAudio) {
      const ext = path.extname(fallbackAudio).toLowerCase();
      const mime = song.mimeType || MIME_BY_EXT[ext] || 'audio/wav';
      return streamFileWithRange(req, res, fallbackAudio, mime);
    }

    // 4. Check if audioUrl has relative path on disk
    if (song.audioUrl && !song.audioUrl.startsWith('/api/')) {
      const altPath = StorageService.getAudioAbsolutePath(song.audioUrl);
      if (fs.existsSync(altPath)) {
        const ext = path.extname(altPath).toLowerCase();
        const mime = song.mimeType || MIME_BY_EXT[ext] || 'audio/mpeg';
        return streamFileWithRange(req, res, altPath, mime);
      }
    }

    throw new AppError('Audio file not found on disk or remote storage', 404);
  }

  static async streamArtwork(req: Request, res: Response) {
    const song = await SongService.getSongRaw(req.params.id as string);
    if (!song) {
      throw new AppError('Song not found', 404);
    }

    // 1. Remote cover redirect
    if (song.coverUrl && (song.coverUrl.startsWith('http://') || song.coverUrl.startsWith('https://'))) {
      return res.redirect(song.coverUrl);
    }

    // 2. Local disk cover
    if (song.coverRelativePath) {
      const absolutePath = StorageService.getArtworkAbsolutePath(song.coverRelativePath);
      if (fs.existsSync(absolutePath)) {
        const ext = path.extname(absolutePath).toLowerCase();
        const mime = MIME_BY_EXT[ext] || 'image/jpeg';
        return streamFileWithRange(req, res, absolutePath, mime);
      }
    }

    // 3. Fallback demo cover
    const fallbackCover = findArtworkFallbackPath(song);
    if (fallbackCover) {
      const ext = path.extname(fallbackCover).toLowerCase();
      const mime = MIME_BY_EXT[ext] || 'image/svg+xml';
      return streamFileWithRange(req, res, fallbackCover, mime);
    }

    // 4. Default high-contrast SVG cover placeholder (prevents broken 404 image icons)
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5"><rect width="24" height="24" fill="#141922"/><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`
    );
  }

  static async downloadAudio(req: Request, res: Response) {
    const song = await SongService.getSongRaw(req.params.id as string);
    if (!song) {
      throw new AppError('Song not found', 404);
    }
    if (!song.isDownloadable) {
      throw new AppError('This song is not authorized for download.', 403);
    }

    // 1. Remote download redirect
    if (song.audioUrl && (song.audioUrl.startsWith('http://') || song.audioUrl.startsWith('https://'))) {
      return res.redirect(song.audioUrl);
    }

    const fileName =
      song.originalFileName ||
      song.audioFileName ||
      `${song.artist} - ${song.title}.mp3`;

    // 2. Local disk file
    if (song.audioRelativePath) {
      const absolutePath = StorageService.getAudioAbsolutePath(song.audioRelativePath);
      if (fs.existsSync(absolutePath)) {
        const ext = path.extname(absolutePath).toLowerCase();
        const mime = song.mimeType || MIME_BY_EXT[ext] || 'audio/mpeg';
        return streamFileWithRange(req, res, absolutePath, mime, fileName);
      }
    }

    // 3. Fallback demo file
    const fallbackAudio = findAudioFallbackPath(song);
    if (fallbackAudio) {
      const ext = path.extname(fallbackAudio).toLowerCase();
      const mime = song.mimeType || MIME_BY_EXT[ext] || 'audio/wav';
      return streamFileWithRange(req, res, fallbackAudio, mime, fileName);
    }

    throw new AppError('Audio file not found for download', 404);
  }
}
