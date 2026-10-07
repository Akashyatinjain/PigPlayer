import { SongRepository } from '../repositories/song.repository';
import { StorageService } from './storage.service';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

export class SongService {
  static async listSongs(params: {
    query?: string;
    genre?: string;
    page?: number;
    limit?: number;
  }) {
    return SongRepository.findMany(params);
  }

  static async getSongById(id: string) {
    const song = await SongRepository.findById(id);
    if (!song) {
      throw new AppError('Song not found', 404);
    }
    return song;
  }

  static async getSongRaw(id: string) {
    const song = await SongRepository.findByIdRaw(id);
    if (!song) {
      throw new AppError('Song not found', 404);
    }
    return song;
  }

  static async checkDuplicate(params: {
    fileHash?: string;
    title?: string;
    artist?: string;
  }) {
    return SongRepository.findDuplicate(params);
  }

  static async createSong(
    data: {
      title: string;
      artist: string;
      album?: string | null;
      albumArtist?: string | null;
      genre?: string | null;
      duration?: number;
      trackNumber?: number | null;
      discNumber?: number | null;
      releaseYear?: number | null;
      composer?: string | null;
      audioRelativePath: string;
      audioFileName?: string | null;
      coverRelativePath?: string | null;
      coverFileName?: string | null;
      originalFileName?: string | null;
      fileSize?: number | null;
      mimeType?: string | null;
      fileHash?: string | null;
      bitrate?: number | null;
      isDownloadable?: boolean;
      // legacy aliases from older clients
      audioUrl?: string;
      coverUrl?: string | null;
      fileName?: string | null;
    },
    userId?: string,
    options?: { replaceHash?: boolean; allowDuplicate?: boolean }
  ) {
    if (data.fileHash && !options?.allowDuplicate) {
      const existing = await SongRepository.findByHash(data.fileHash);
      if (existing) {
        if (options?.replaceHash) {
          await this.deleteSong(existing.id);
        } else {
          throw new AppError(
            'A song with this exact audio file hash already exists.',
            409
          );
        }
      }
    }

    const audioRelativePath =
      data.audioRelativePath ||
      (data.audioUrl && !data.audioUrl.startsWith('http') && !data.audioUrl.startsWith('/api/')
        ? data.audioUrl.replace(/^\//, '')
        : '');

    if (!audioRelativePath) {
      throw new AppError('audioRelativePath is required', 400);
    }

    if (!StorageService.exists(audioRelativePath)) {
      throw new AppError('Audio file missing on disk', 400);
    }

    const coverRelativePath =
      data.coverRelativePath ||
      (data.coverUrl &&
      !data.coverUrl.startsWith('http') &&
      !data.coverUrl.startsWith('/api/')
        ? String(data.coverUrl).replace(/^\//, '')
        : null);

    const song = await SongRepository.create({
      title: data.title,
      artist: data.artist,
      album: data.album || null,
      albumArtist: data.albumArtist || null,
      genre: data.genre || null,
      duration: Number(data.duration) || 0,
      trackNumber: data.trackNumber != null ? Number(data.trackNumber) : null,
      discNumber: data.discNumber != null ? Number(data.discNumber) : null,
      releaseYear: data.releaseYear != null ? Number(data.releaseYear) : null,
      composer: data.composer || null,
      audioRelativePath,
      audioFileName: data.audioFileName || null,
      coverRelativePath: coverRelativePath || null,
      coverFileName: data.coverFileName || null,
      originalFileName: data.originalFileName || data.fileName || null,
      fileSize: data.fileSize != null ? Number(data.fileSize) : null,
      mimeType: data.mimeType || 'audio/mpeg',
      fileHash: data.fileHash || null,
      bitrate: data.bitrate != null ? Number(data.bitrate) : null,
      isDownloadable:
        data.isDownloadable !== undefined ? Boolean(data.isDownloadable) : true,
      ...(userId ? { user: { connect: { id: userId } } } : {}),
    });

    logger.info(`Uploaded song: ${song.title}`);
    return song;
  }

  static async updateSong(id: string, data: Record<string, unknown>) {
    const song = await SongRepository.findByIdRaw(id);
    if (!song) {
      throw new AppError('Song not found', 404);
    }

    const allowed = [
      'title',
      'artist',
      'album',
      'albumArtist',
      'genre',
      'duration',
      'trackNumber',
      'discNumber',
      'releaseYear',
      'composer',
      'bitrate',
      'isDownloadable',
      'coverRelativePath',
      'coverFileName',
    ] as const;

    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (data[key] !== undefined) update[key] = data[key];
    }
    if (data.releaseYear !== undefined) update.releaseYear = data.releaseYear;
    if (data.coverUrl !== undefined && typeof data.coverUrl === 'string') {
      if (!data.coverUrl.startsWith('http') && !data.coverUrl.startsWith('/api/')) {
        update.coverRelativePath = data.coverUrl.replace(/^\//, '');
      }
    }

    return SongRepository.update(id, update);
  }

  static async deleteSong(id: string) {
    const song = await SongRepository.findByIdRaw(id);
    if (!song) {
      throw new AppError('Song not found', 404);
    }

    // DB first for relations, then files (orphan cleanup can recover leftovers)
    await SongRepository.delete(id);

    if (song.audioRelativePath) {
      await StorageService.deleteAudio(song.audioRelativePath);
    }
    if (song.coverRelativePath) {
      // Only delete artwork if unused by other songs
      const { prisma } = await import('../config/database');
      const stillUsed = await prisma.song.count({
        where: { coverRelativePath: song.coverRelativePath },
      });
      if (stillUsed === 0) {
        await StorageService.deleteArtwork(song.coverRelativePath);
      }
    }

    return true;
  }

  static async getDownload(id: string) {
    const song = await SongRepository.findByIdRaw(id);
    if (!song) {
      throw new AppError('Song not found', 404);
    }

    if (!song.isDownloadable) {
      throw new AppError('This song is not authorized for download.', 403);
    }

    const absolutePath = StorageService.getAudioAbsolutePath(song.audioRelativePath);
    const fileName =
      song.originalFileName ||
      song.audioFileName ||
      `${song.artist} - ${song.title}.mp3`;

    return { absolutePath, fileName, mimeType: song.mimeType || 'audio/mpeg' };
  }

  static async getLibraryStats() {
    return SongRepository.getLibraryStats();
  }
}
