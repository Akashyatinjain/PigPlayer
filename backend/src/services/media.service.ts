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
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * Stream a local file with HTTP Range support (required for seeking).
 * Never loads the entire file into memory.
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
  const range = req.headers.range;

  if (downloadName) {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    );
  }

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'private, max-age=3600');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (Number.isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      res.end();
      return;
    }

    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunkSize);

    const stream = fs.createReadStream(absolutePath, { start, end });
    stream.on('error', (err) => {
      logger.error('Audio stream error', err.message);
      if (!res.headersSent) res.status(500).end();
      else res.destroy();
    });
    stream.pipe(res);
    return;
  }

  res.status(200);
  res.setHeader('Content-Length', fileSize);
  const stream = fs.createReadStream(absolutePath);
  stream.on('error', (err) => {
    logger.error('Audio stream error', err.message);
    if (!res.headersSent) res.status(500).end();
    else res.destroy();
  });
  stream.pipe(res);
}

export class MediaService {
  static async streamAudio(req: Request, res: Response) {
    const song = await SongService.getSongRaw(req.params.id as string);
    if (!song.audioRelativePath) {
      if (song.audioUrl) {
        return res.redirect(song.audioUrl);
      }
      throw new AppError('Audio file not found', 404);
    }
    const absolutePath = StorageService.getAudioAbsolutePath(song.audioRelativePath);
    const ext = path.extname(absolutePath).toLowerCase();
    const mime = song.mimeType || MIME_BY_EXT[ext] || 'audio/mpeg';
    streamFileWithRange(req, res, absolutePath, mime);
  }

  static async streamArtwork(req: Request, res: Response) {
    const song = await SongService.getSongRaw(req.params.id as string);
    if (!song.coverRelativePath) {
      throw new AppError('Artwork not found', 404);
    }
    const absolutePath = StorageService.getArtworkAbsolutePath(song.coverRelativePath);
    const ext = path.extname(absolutePath).toLowerCase();
    const mime = MIME_BY_EXT[ext] || 'image/jpeg';
    streamFileWithRange(req, res, absolutePath, mime);
  }

  static async downloadAudio(req: Request, res: Response) {
    const { absolutePath, fileName, mimeType } = await SongService.getDownload(
      req.params.id as string
    );
    streamFileWithRange(req, res, absolutePath, mimeType, fileName);
  }
}
