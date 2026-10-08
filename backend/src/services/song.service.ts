import fs from 'fs';
import path from 'path';
import { SongRepository } from '../repositories/song.repository';
import { StorageService } from './storage.service';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { DATA_ROOT, TEMP_DIR } from '../config/paths';
import { config } from '../config/env';

export const FALLBACK_DEMO_SONGS = [
  {
    id: 'demo-1',
    title: 'Midnight Drift',
    artist: 'Soundify Demo',
    album: 'Local Library',
    albumArtist: 'Soundify Demo',
    genre: 'Ambient',
    duration: 30,
    trackNumber: 1,
    discNumber: null,
    releaseYear: 2026,
    composer: null,
    audioUrl: '/api/songs/demo-1/audio',
    coverUrl: '/api/songs/demo-1/artwork',
    audioRelativePath: 'demo/midnight-drift.wav',
    audioFileName: 'midnight-drift.wav',
    coverRelativePath: 'demo/covers/cover-1.svg',
    coverFileName: 'cover-1.svg',
    originalFileName: 'midnight-drift.wav',
    mimeType: 'audio/wav',
    fileSize: 5644844,
    fileHash: null,
    bitrate: 1411,
    isDownloadable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'demo-2',
    title: 'Golden Hour Glow',
    artist: 'Soundify Demo',
    album: 'Local Library',
    albumArtist: 'Soundify Demo',
    genre: 'Chill',
    duration: 30,
    trackNumber: 2,
    discNumber: null,
    releaseYear: 2026,
    composer: null,
    audioUrl: '/api/songs/demo-2/audio',
    coverUrl: '/api/songs/demo-2/artwork',
    audioRelativePath: 'demo/golden-hour-glow.wav',
    audioFileName: 'golden-hour-glow.wav',
    coverRelativePath: 'demo/covers/cover-2.svg',
    coverFileName: 'cover-2.svg',
    originalFileName: 'golden-hour-glow.wav',
    mimeType: 'audio/wav',
    fileSize: 4939244,
    fileHash: null,
    bitrate: 1411,
    isDownloadable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'demo-3',
    title: 'Velvet Horizons',
    artist: 'Soundify Demo',
    album: 'Local Library',
    albumArtist: 'Soundify Demo',
    genre: 'Electronic',
    duration: 30,
    trackNumber: 3,
    discNumber: null,
    releaseYear: 2026,
    composer: null,
    audioUrl: '/api/songs/demo-3/audio',
    coverUrl: '/api/songs/demo-3/artwork',
    audioRelativePath: 'demo/velvet-horizons.wav',
    audioFileName: 'velvet-horizons.wav',
    coverRelativePath: 'demo/covers/cover-3.svg',
    coverFileName: 'cover-3.svg',
    originalFileName: 'velvet-horizons.wav',
    mimeType: 'audio/wav',
    fileSize: 5997644,
    fileHash: null,
    bitrate: 1411,
    isDownloadable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'demo-4',
    title: 'Echoes of Silence',
    artist: 'Soundify Demo',
    album: 'Local Library',
    albumArtist: 'Soundify Demo',
    genre: 'Lo-Fi',
    duration: 30,
    trackNumber: 4,
    discNumber: null,
    releaseYear: 2026,
    composer: null,
    audioUrl: '/api/songs/demo-4/audio',
    coverUrl: '/api/songs/demo-4/artwork',
    audioRelativePath: 'demo/echoes-of-silence.wav',
    audioFileName: 'echoes-of-silence.wav',
    coverRelativePath: 'demo/covers/cover-4.svg',
    coverFileName: 'cover-4.svg',
    originalFileName: 'echoes-of-silence.wav',
    mimeType: 'audio/wav',
    fileSize: 5292044,
    fileHash: null,
    bitrate: 1411,
    isDownloadable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'demo-5',
    title: 'Quantum Horizons',
    artist: 'Soundify Demo',
    album: 'Local Library',
    albumArtist: 'Soundify Demo',
    genre: 'Synthwave',
    duration: 30,
    trackNumber: 5,
    discNumber: null,
    releaseYear: 2026,
    composer: null,
    audioUrl: '/api/songs/demo-5/audio',
    coverUrl: '/api/songs/demo-5/artwork',
    audioRelativePath: 'demo/quantum-horizons.wav',
    audioFileName: 'quantum-horizons.wav',
    coverRelativePath: 'demo/covers/cover-5.svg',
    coverFileName: 'cover-5.svg',
    originalFileName: 'quantum-horizons.wav',
    mimeType: 'audio/wav',
    fileSize: 4586444,
    fileHash: null,
    bitrate: 1411,
    isDownloadable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

let lastSuccessfulSongs: any[] = [];
try {
  const exportPath = path.join(DATA_ROOT, 'sqlite_songs_export.json');
  if (fs.existsSync(exportPath)) {
    const raw = fs.readFileSync(exportPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      lastSuccessfulSongs = parsed.map((s: any) => ({
        ...s,
        audioUrl: `/api/songs/${s.id}/audio`,
        coverUrl: s.coverRelativePath ? `/api/songs/${s.id}/artwork` : null,
      }));
    }
  }
} catch {
  // ignore
}

export class SongService {
  static async listSongs(params: {
    query?: string;
    genre?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const res = await SongRepository.findMany(params);
      if (res.songs && res.songs.length > 0) {
        lastSuccessfulSongs = res.songs;
      }
      return res;
    } catch (dbErr: any) {
      logger.warn(`Database unreachable in listSongs: ${dbErr?.message}. Falling back to resilient cache.`);
      const source = lastSuccessfulSongs.length > 0 ? lastSuccessfulSongs : FALLBACK_DEMO_SONGS;

      let filtered = source;
      if (params.query) {
        const q = params.query.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.title?.toLowerCase().includes(q) ||
            s.artist?.toLowerCase().includes(q) ||
            s.album?.toLowerCase().includes(q)
        );
      }
      if (params.genre && params.genre !== 'All') {
        const g = params.genre.toLowerCase();
        filtered = filtered.filter((s) => s.genre?.toLowerCase().includes(g));
      }

      const page = params.page || 1;
      const limit = params.limit || 50;
      const skip = (page - 1) * limit;

      return {
        songs: filtered.slice(skip, skip + limit),
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit) || 1,
        },
      };
    }
  }

  static async getSongById(id: string) {
    try {
      const song = await SongRepository.findById(id);
      if (!song) {
        throw new AppError('Song not found', 404);
      }
      return song;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.warn(`Database error in getSongById(${id}): ${err?.message}`);
      const memorySong =
        lastSuccessfulSongs.find((s) => s.id === id) ||
        FALLBACK_DEMO_SONGS.find((s) => s.id === id);

      if (memorySong) return memorySong;
      throw new AppError('Song not found', 404);
    }
  }

  static async getSongRaw(id: string) {
    try {
      const song = await SongRepository.findByIdRaw(id);
      if (!song) {
        throw new AppError('Song not found', 404);
      }
      return song;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.warn(`Database error in getSongRaw(${id}): ${err?.message}`);
      const memorySong =
        lastSuccessfulSongs.find((s) => s.id === id) ||
        FALLBACK_DEMO_SONGS.find((s) => s.id === id);

      if (memorySong) return memorySong as any;
      throw new AppError('Song not found', 404);
    }
  }

  static async checkDuplicate(params: {
    fileHash?: string;
    title?: string;
    artist?: string;
  }) {
    try {
      return await SongRepository.findDuplicate(params);
    } catch {
      return null;
    }
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
      audioUrl?: string;
      coverUrl?: string | null;
      fileName?: string | null;
    },
    userId?: string,
    options?: { replaceHash?: boolean; allowDuplicate?: boolean }
  ) {
    let replacement: Awaited<ReturnType<typeof SongRepository.findRawByHash>> = null;
    if (data.fileHash && !options?.allowDuplicate) {
      try {
        const existing = await SongRepository.findRawByHash(data.fileHash);
        if (existing) {
          if (options?.replaceHash) {
            if (config.env === 'production' && existing.userId !== userId) {
              throw new AppError('Only the owner can replace this song.', 403);
            }
            replacement = existing;
          } else {
            throw new AppError(
              'A song with this exact audio file hash already exists.',
              409
            );
          }
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
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

    const absoluteAudioPath = StorageService.getAudioAbsolutePath(audioRelativePath);
    const resolvedTempDir = path.resolve(TEMP_DIR);
    if (
      absoluteAudioPath === resolvedTempDir ||
      absoluteAudioPath.startsWith(`${resolvedTempDir}${path.sep}`)
    ) {
      throw new AppError('Uploaded audio must be stored in permanent media storage', 400);
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

    const songData = {
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
    };

    if (replacement) {
      // Update the existing row in place so playlist, favorite, and history links survive.
      const updated = await SongRepository.update(replacement.id, songData);
      if (replacement.audioRelativePath !== audioRelativePath && replacement.audioRelativePath) {
        await StorageService.deleteAudio(replacement.audioRelativePath);
      }
      if (replacement.coverRelativePath && replacement.coverRelativePath !== (coverRelativePath || null)) {
        const { prisma } = await import('../config/database');
        const stillUsed = await prisma.song.count({
          where: { coverRelativePath: replacement.coverRelativePath },
        });
        if (stillUsed === 0) await StorageService.deleteArtwork(replacement.coverRelativePath);
      }
      logger.info(`Replaced song media: ${updated.title}`);
      return updated;
    }

    const song = await SongRepository.create({
      ...songData,
      ...(userId ? { user: { connect: { id: userId } } } : {}),
    });

    logger.info(`Uploaded song: ${song.title}`);
    return song;
  }

  static async updateSong(id: string, data: Record<string, unknown>, userId?: string, isAdmin = false) {
    const song = await SongRepository.findByIdRaw(id);
    if (!song) {
      throw new AppError('Song not found', 404);
    }
    if (config.env === 'production' && !isAdmin && song.userId !== userId) {
      throw new AppError('Only the song owner can update this song.', 403);
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

  static async deleteSong(id: string, userId?: string, isAdmin = false) {
    const song = await SongRepository.findByIdRaw(id);
    if (!song) {
      throw new AppError('Song not found', 404);
    }
    if (config.env === 'production' && !isAdmin && song.userId !== userId) {
      throw new AppError('Only the song owner can delete this song.', 403);
    }

    await SongRepository.delete(id);

    if (song.audioRelativePath) {
      await StorageService.deleteAudio(song.audioRelativePath);
    }
    if (song.coverRelativePath) {
      const { prisma } = await import('../config/database');
      const stillUsed = await prisma.song.count({
        where: { coverRelativePath: song.coverRelativePath },
      });
      if (stillUsed === 0) {
        await StorageService.deleteArtwork(song.coverRelativePath);
      }
    }

    lastSuccessfulSongs = lastSuccessfulSongs.filter((s) => s.id !== id);
    return true;
  }

  static async deleteAllSongs() {
    const { prisma } = await import('../config/database');
    const songs = await prisma.song.findMany({
      select: { audioRelativePath: true, coverRelativePath: true },
    });

    // Do not delete media or report success unless the database deletion succeeds.
    await SongRepository.deleteAll();

    // Delete associated physical media files (skipping demo files)
    for (const song of songs) {
      if (song.audioRelativePath && !song.audioRelativePath.startsWith('demo/')) {
        await StorageService.deleteAudio(song.audioRelativePath).catch((error) => {
          logger.warn(`Failed to remove audio file ${song.audioRelativePath}: ${String(error)}`);
        });
      }
      if (song.coverRelativePath && !song.coverRelativePath.startsWith('demo/')) {
        await StorageService.deleteArtwork(song.coverRelativePath).catch((error) => {
          logger.warn(`Failed to remove artwork file ${song.coverRelativePath}: ${String(error)}`);
        });
      }
    }

    lastSuccessfulSongs = [];
    return true;
  }

  static async getDownload(id: string) {
    const song = await this.getSongRaw(id);
    if (!song) {
      throw new AppError('Song not found', 404);
    }

    if (!song.isDownloadable) {
      throw new AppError('This song is not authorized for download.', 403);
    }

    const absolutePath = song.audioRelativePath
      ? StorageService.getAudioAbsolutePath(song.audioRelativePath)
      : song.audioUrl;
    const fileName =
      song.originalFileName ||
      song.audioFileName ||
      `${song.artist} - ${song.title}.mp3`;

    return { absolutePath, fileName, mimeType: song.mimeType || 'audio/mpeg' };
  }

  static async getLibraryStats() {
    try {
      return await SongRepository.getLibraryStats();
    } catch {
      return {
        totalSongs: lastSuccessfulSongs.length || FALLBACK_DEMO_SONGS.length,
        totalArtists: 1,
        totalAlbums: 1,
        totalPlaylists: 0,
        favoriteSongs: 0,
        listeningHistoryCount: 0,
        totalStorageBytes: 25000000,
      };
    }
  }
}
