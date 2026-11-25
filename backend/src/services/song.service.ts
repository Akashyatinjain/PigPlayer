import fs from 'node:fs/promises';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { config } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { SongRepository } from '../repositories/song.repository';
import { logger } from '../utils/logger';
import { mapSongForApi } from '../utils/song-mapper';
import { StorageService } from './storage.service';

type NewSong = Omit<Prisma.SongUncheckedCreateInput, 'audioRelativePath'> & {
  audioRelativePath?: string;
  fileName?: string | null;
};

function localUrl(value?: string | null) {
  return value && !/^https?:\/\//i.test(value) && !value.startsWith('/api/') ? value : null;
}

async function checkMedia(relativePath: string, kind: 'audio' | 'artwork') {
  try {
    const target = kind === 'audio'
      ? StorageService.getAudioAbsolutePath(relativePath)
      : StorageService.getArtworkAbsolutePath(relativePath);
    if ((await fs.stat(target)).isFile()) return;
  } catch {
    // Treat missing files and invalid storage paths as input errors.
  }
  throw new AppError(`Provide an existing file in ${kind} storage.`, 400);
}

async function releaseMedia(relativePath: string | null, kind: 'audio' | 'artwork') {
  if (!relativePath) return;
  try {
    const field = kind === 'audio' ? 'audioRelativePath' : 'coverRelativePath';
    if (await prisma.song.findFirst({ where: { [field]: relativePath }, select: { id: true } })) return;
    const removed = await (kind === 'audio'
      ? StorageService.deleteAudio(relativePath)
      : StorageService.deleteArtwork(relativePath));
    if (!removed) logger.warn('Unused media could not be removed');
  } catch {
    logger.warn('Could not verify whether media is still referenced');
  }
}

function canEdit(ownerId: string | null, actorId?: string, isAdmin = false) {
  return isAdmin || (Boolean(actorId) && ownerId === actorId) ||
    (ownerId === null && config.env !== 'production' && config.allowGuestMutations);
}

export class SongService {
  static listSongs(params: Parameters<typeof SongRepository.findMany>[0]) {
    return SongRepository.findMany(params);
  }

  static async getSongById(id: string) {
    return mapSongForApi(await this.getSongRaw(id));
  }

  static async getSongRaw(id: string) {
    const song = await SongRepository.findByIdRaw(id);
    if (!song) throw new AppError('Song not found', 404);
    return song;
  }

  static checkDuplicate(params: Parameters<typeof SongRepository.findDuplicate>[0]) {
    return SongRepository.findDuplicate(params);
  }

  static async createSong(
    data: NewSong,
    userId?: string,
    options?: { replaceHash?: boolean; allowDuplicate?: boolean; isAdmin?: boolean }
  ) {
    const audioRelativePath = data.audioRelativePath || localUrl(data.audioUrl);
    if (!audioRelativePath) throw new AppError('audioRelativePath is required', 400);
    await checkMedia(audioRelativePath, 'audio');
    const coverRelativePath = data.coverRelativePath || localUrl(data.coverUrl);
    if (coverRelativePath) await checkMedia(coverRelativePath, 'artwork');

    const songData = {
      title: data.title,
      artist: data.artist,
      album: data.album || null,
      albumArtist: data.albumArtist || null,
      genre: data.genre || null,
      duration: data.duration ?? 0,
      trackNumber: data.trackNumber ?? null,
      discNumber: data.discNumber ?? null,
      releaseYear: data.releaseYear ?? null,
      composer: data.composer || null,
      audioRelativePath,
      audioFileName: data.audioFileName || null,
      coverRelativePath: coverRelativePath || null,
      coverFileName: data.coverFileName || null,
      originalFileName: data.originalFileName || data.fileName || null,
      fileSize: data.fileSize ?? null,
      mimeType: data.mimeType || 'audio/mpeg',
      fileHash: data.fileHash || null,
      bitrate: data.bitrate ?? null,
      isDownloadable: data.isDownloadable ?? true,
    };

    const { song, previous } = await prisma.$transaction(async (tx) => {
      const previous = data.fileHash && !options?.allowDuplicate
        ? await tx.song.findFirst({ where: { fileHash: data.fileHash }, orderBy: { id: 'asc' } })
        : null;
      if (previous) {
        if (!options?.replaceHash) {
          throw new AppError('A song with this exact audio file hash already exists.', 409);
        }
        if (!canEdit(previous.userId, userId, options.isAdmin)) {
          throw new AppError('Only the owner can replace this song.', 403);
        }
        const song = await tx.song.update({
          where: { id: previous.id },
          data: { ...songData, coverUrl: coverRelativePath ? `/api/songs/${previous.id}/artwork` : null },
        });
        return { song, previous };
      }
      const song = await tx.song.create({ data: { ...songData, userId } });
      return { song, previous };
    });

    if (previous) {
      if (previous.audioRelativePath !== song.audioRelativePath) await releaseMedia(previous.audioRelativePath, 'audio');
      if (previous.coverRelativePath !== song.coverRelativePath) await releaseMedia(previous.coverRelativePath, 'artwork');
    }
    return mapSongForApi(song);
  }

  static async updateSong(id: string, data: Record<string, unknown>, userId?: string, isAdmin = false) {
    const fields = [
      'title', 'artist', 'album', 'albumArtist', 'genre', 'duration', 'trackNumber',
      'discNumber', 'releaseYear', 'composer', 'bitrate', 'isDownloadable', 'coverFileName',
    ];
    const update = Object.fromEntries(fields.filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
    const coverPath = data.coverRelativePath === null || typeof data.coverRelativePath === 'string'
      ? data.coverRelativePath : typeof data.coverUrl === 'string' ? localUrl(data.coverUrl) ?? undefined : undefined;
    if (coverPath) await checkMedia(coverPath, 'artwork');
    if (coverPath !== undefined) {
      update.coverRelativePath = coverPath;
      update.coverUrl = coverPath ? `/api/songs/${id}/artwork` : null;
    }

    const song = await this.getSongRaw(id);
    if (!canEdit(song.userId, userId, isAdmin)) {
      throw new AppError('Only the song owner can update this song.', 403);
    }
    const updated = await prisma.song.update({ where: { id, userId: song.userId }, data: update });
    if (song.coverRelativePath !== updated.coverRelativePath) await releaseMedia(song.coverRelativePath, 'artwork');
    return mapSongForApi(updated);
  }

  static async deleteSong(id: string, userId?: string, isAdmin = false) {
    const song = await this.getSongRaw(id);
    if (!canEdit(song.userId, userId, isAdmin)) {
      throw new AppError('Only the song owner can delete this song.', 403);
    }
    await prisma.song.delete({ where: { id, userId: song.userId } });
    await releaseMedia(song.audioRelativePath, 'audio');
    await releaseMedia(song.coverRelativePath, 'artwork');
  }

  static async deleteAllSongs() {
    const songs = await prisma.$transaction(async (tx) => {
      const rows = await tx.song.findMany({ select: { audioRelativePath: true, coverRelativePath: true } });
      await tx.song.deleteMany();
      return rows;
    });
    for (const audioPath of new Set(songs.map((song) => song.audioRelativePath))) {
      await releaseMedia(audioPath, 'audio');
    }
    for (const coverPath of new Set(songs.map((song) => song.coverRelativePath))) {
      await releaseMedia(coverPath, 'artwork');
    }
  }

  static getLibraryStats(userId?: string) {
    return SongRepository.getLibraryStats(userId);
  }
}
