import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { SongService } from './song.service';
import { StorageService } from './storage.service';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

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

function mediaFile(relativePath: string, kind: 'audio' | 'artwork') {
  try {
    let absolutePath: string;
    const demoPath = /^demo\/(?:covers\/)?[\w.-]+$/.test(relativePath);
    if (demoPath) {
      absolutePath = path.resolve(__dirname, '../../public', relativePath);
    } else {
      absolutePath = kind === 'audio'
        ? StorageService.getAudioAbsolutePath(relativePath)
        : StorageService.getArtworkAbsolutePath(relativePath);
    }
    const mime = MIME_BY_EXT[path.extname(absolutePath).toLowerCase()];
    if (!mime?.startsWith(kind === 'audio' ? 'audio/' : 'image/')) return null;
    return { absolutePath, mime };
  } catch {
    return null;
  }
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
  const stat = fs.statSync(absolutePath, { throwIfNoEntry: false });
  if (!stat?.isFile()) {
    throw new AppError('Media file not found on disk', 404);
  }

  const fileSize = stat.size;
  const etag = `"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
  const lastModified = stat.mtime.toUTCString();
  const ifRange = req.headers['if-range'];
  const rangeHeader = !ifRange || ifRange === etag || ifRange === lastModified ? req.headers.range : undefined;
  if (downloadName) res.attachment(path.basename(downloadName.replace(/\\/g, '/')));
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', lastModified);

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', mimeType);
  // The URL is keyed by song ID, while a replace upload can change its file.
  // Revalidate on every playback request instead of treating this mutable URL as immutable.
  res.setHeader('Cache-Control', 'private, no-cache, must-revalidate');

  if (!rangeHeader && req.fresh) {
    res.status(304).end();
    return;
  }

  let range: { start: number; end: number } | undefined;
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
    if (!match || (!match[1] && !match[2])) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
      return;
    }

    let start: number;
    let end: number;

    if (!match[1]) {
      // Suffix range: bytes=-500 (last 500 bytes)
      const suffix = Number.parseInt(match[2], 10);
      if (!Number.isSafeInteger(suffix) || suffix <= 0) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        return;
      }
      start = Math.max(0, fileSize - suffix);
      end = fileSize - 1;
    } else {
      start = Number.parseInt(match[1], 10);
      end = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1;
    }

    // Clamp end to file size per RFC 7233
    if (end >= fileSize) {
      end = fileSize - 1;
    }

    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= fileSize) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      res.end();
      return;
    }

    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunkSize);

    range = { start, end };
  } else {
    res.status(200);
    res.setHeader('Content-Length', fileSize);
  }

  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const stream = fs.createReadStream(absolutePath, range);

  res.on('close', () => {
    if (!res.writableFinished && !stream.destroyed) stream.destroy();
  });

  stream.on('error', (err) => {
    if (!stream.destroyed) stream.destroy();
    logger.error('Media stream failed', (err as NodeJS.ErrnoException).code);
    if (!res.headersSent) {
      res.removeHeader('Content-Length');
      res.removeHeader('Content-Range');
      res.removeHeader('Content-Disposition');
      res.status(500).end();
    }
    else res.destroy();
  });

  stream.pipe(res);
}

export class MediaService {
  static async streamAudio(req: Request, res: Response) {
    const song = await SongService.getSongRaw(req.params.id as string);
    const media = mediaFile(song.audioRelativePath, 'audio');
    if (!media) throw new AppError('Audio file not found in local storage', 404);
    streamFileWithRange(req, res, media.absolutePath, media.mime);
  }

  static async streamArtwork(req: Request, res: Response) {
    const song = await SongService.getSongRaw(req.params.id as string);
    const media = song.coverRelativePath && mediaFile(song.coverRelativePath, 'artwork');
    if (media && fs.existsSync(media.absolutePath)) {
      return streamFileWithRange(req, res, media.absolutePath, media.mime);
    }

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'private, no-cache, must-revalidate');
    return res.send(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5"><rect width="24" height="24" fill="#141922"/><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
    );
  }

  static async downloadAudio(req: Request, res: Response) {
    const song = await SongService.getSongRaw(req.params.id as string);
    if (!song.isDownloadable) throw new AppError('This song is not authorized for download.', 403);
    const media = mediaFile(song.audioRelativePath, 'audio');
    if (!media) throw new AppError('Audio file not found for download', 404);
    const fileName = song.originalFileName || song.audioFileName || path.basename(media.absolutePath);
    streamFileWithRange(req, res, media.absolutePath, media.mime, fileName);
  }
}
