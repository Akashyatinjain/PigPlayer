import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import archiver from 'archiver';
import Extract from 'extract-zip';
import { prisma } from '../config/database';
import {
  BACKUPS_DIR,
  DB_PATH,
  AUDIO_DIR,
  ARTWORK_DIR,
  ensureStorageDirectories,
  resolveSafeDataPath,
} from '../config/paths';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { SongRepository } from '../repositories/song.repository';
import { getDefaultLocalUserId } from './bootstrap.service';

export class BackupService {
  static async listBackups() {
    ensureStorageDirectories();
    const files = await fs.promises.readdir(BACKUPS_DIR);
    const backups = await Promise.all(
      files
        .filter((f) => f.endsWith('.zip'))
        .map(async (fileName) => {
          const absolute = path.join(BACKUPS_DIR, fileName);
          const stat = await fs.promises.stat(absolute);
          return {
            fileName,
            size: stat.size,
            createdAt: stat.mtime.toISOString(),
            path: `backups/${fileName}`,
          };
        })
    );
    return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  static async createBackup(options?: { includeMedia?: boolean }) {
    ensureStorageDirectories();
    const includeMedia = options?.includeMedia !== false;
    const stamp = `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${Math.random().toString(36).slice(2, 8)}`;
    const fileName = `soundify-backup-${stamp}.zip`;
    const outPath = path.join(BACKUPS_DIR, fileName);

    // Export metadata JSON snapshot
    const [songs, playlists, favorites, history, users] = await Promise.all([
      prisma.song.findMany(),
      prisma.playlist.findMany({ include: { songs: true } }),
      prisma.favorite.findMany(),
      prisma.playHistory.findMany(),
      prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      }),
    ]);

    const metaPath = path.join(BACKUPS_DIR, `_meta_${stamp}.json`);
    await fs.promises.writeFile(
      metaPath,
      JSON.stringify(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          songs,
          playlists,
          favorites,
          history,
          users,
        },
        null,
        2
      )
    );

    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(outPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', reject);
      archive.pipe(output);

      archive.file(metaPath, { name: 'library.json' });

      if (fs.existsSync(DB_PATH)) {
        archive.file(DB_PATH, { name: 'soundify.db' });
      }

      if (includeMedia) {
        if (fs.existsSync(AUDIO_DIR)) {
          archive.directory(AUDIO_DIR, 'audio');
        }
        if (fs.existsSync(ARTWORK_DIR)) {
          archive.directory(ARTWORK_DIR, 'artwork');
        }
      }

      archive.finalize();
    });

    await fs.promises.unlink(metaPath).catch(() => undefined);
    logger.info(`Backup created: ${fileName}`);

    const stat = await fs.promises.stat(outPath);
    return {
      fileName,
      size: stat.size,
      path: `backups/${fileName}`,
      includeMedia,
    };
  }

  /**
   * Restore is careful: extracts to a staging folder and does NOT silently
   * overwrite the live DB unless confirmReplace=true.
   */
  static async restoreBackup(fileName: string, confirmReplace = false) {
    ensureStorageDirectories();
    const safeName = path.basename(fileName);
    if (!safeName.endsWith('.zip')) {
      throw new AppError('Invalid backup file', 400);
    }

    const zipPath = path.join(BACKUPS_DIR, safeName);
    if (!fs.existsSync(zipPath)) {
      throw new AppError('Backup not found', 404);
    }

    const staging = path.join(BACKUPS_DIR, `_restore_${Date.now()}`);
    await fs.promises.mkdir(staging, { recursive: true });

    try {
      await Extract(zipPath, { dir: staging });

      const stagedLibrary = path.join(staging, 'library.json');
      if (!fs.existsSync(stagedLibrary)) {
        throw new AppError('Backup does not contain a library snapshot.', 400);
      }
      let library: unknown;
      try {
        library = JSON.parse(await fs.promises.readFile(stagedLibrary, 'utf-8'));
      } catch {
        throw new AppError('Backup library snapshot is invalid JSON.', 400);
      }
      if (!library || typeof library !== 'object' || Array.isArray(library)) {
        throw new AppError('Backup library snapshot has an invalid format.', 400);
      }
      const snapshot = library as Record<string, unknown>;
      const songCount = Array.isArray(snapshot.songs) ? snapshot.songs.length : 0;
      const playlistCount = Array.isArray(snapshot.playlists) ? snapshot.playlists.length : 0;
      const hasAudio = fs.existsSync(path.join(staging, 'audio'));
      const hasArtwork = fs.existsSync(path.join(staging, 'artwork'));

      if (!confirmReplace) {
        return {
          preview: true,
          message: 'Snapshot validated. Confirm replacement to apply this library backup.',
          hasDatabase: false,
          hasLibraryJson: true,
          songCount,
          playlistCount,
          hasAudio,
          hasArtwork,
        };
      }

      // Keep a recoverable snapshot before changing the live database or media.
      const safetyBackup = await this.createBackup({ includeMedia: true });

      // Restore media folders if present
      for (const folder of ['audio', 'artwork'] as const) {
        const src = path.join(staging, folder);
        if (fs.existsSync(src)) {
          const dest = resolveSafeDataPath(folder);
          await fs.promises.cp(src, dest, { recursive: true });
        }
      }

      const importResult = await this.importLibraryJson(snapshot, 'replace');

      logger.info(`Backup restored from: ${safeName}`);
      return {
        preview: false,
        restored: true,
        fileName: safeName,
        safetyBackup: safetyBackup.fileName,
        ...importResult,
        message: 'Backup restored successfully. A safety backup was created first.',
      };
    } finally {
      await fs.promises.rm(staging, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  static async exportLibraryJson() {
    const [songs, playlists, favorites, history] = await Promise.all([
      prisma.song.findMany(),
      prisma.playlist.findMany({ include: { songs: true } }),
      prisma.favorite.findMany(),
      prisma.playHistory.findMany(),
    ]);

    const stats = await SongRepository.getLibraryStats();

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: { offlineFirst: true },
      stats,
      songs,
      playlists,
      favorites,
      history,
    };
  }

  static async importLibraryJson(
    payload: Record<string, unknown>,
    mode: 'merge' | 'replace' = 'merge'
  ) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new AppError('Library import must be a JSON object.', 400);
    }
    const readRows = (key: string): Array<Record<string, unknown>> => {
      const value = payload[key];
      if (!Array.isArray(value) || value.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
        throw new AppError(`Library import field "${key}" must be an array of objects.`, 400);
      }
      return value as Array<Record<string, unknown>>;
    };
    const inputSongs = readRows('songs');
    const inputPlaylists = readRows('playlists');
    const inputFavorites = readRows('favorites');
    const inputHistory = readRows('history');
    const inputUsers = Array.isArray(payload.users) ? payload.users as Array<Record<string, unknown>> : [];

    const existingSongs = mode === 'merge'
      ? await prisma.song.findMany({ select: { id: true } })
      : [];
    const existingSongIds = new Set(existingSongs.map((song) => song.id));
    const seenSongIds = new Set<string>();
    const songsToImport: Array<Record<string, unknown> & { id: string; audioRelativePath: string }> = [];
    let skippedSongs = 0;

    for (const song of inputSongs) {
      const id = typeof song.id === 'string' ? song.id.trim() : '';
      const title = typeof song.title === 'string' ? song.title.trim() : '';
      const artist = typeof song.artist === 'string' ? song.artist.trim() : '';
      const audioRelativePath = typeof song.audioRelativePath === 'string' ? song.audioRelativePath.trim() : '';
      if (!id || id.length > 191 || !title || !artist || !audioRelativePath || seenSongIds.has(id)) {
        throw new AppError('Library import contains a song with invalid or duplicate required fields.', 400);
      }
      seenSongIds.add(id);

      if (existingSongIds.has(id)) {
        skippedSongs++;
        continue;
      }

      let audioExists = id.startsWith('demo-');
      try {
        const absoluteAudioPath = resolveSafeDataPath(audioRelativePath);
        audioExists ||= fs.existsSync(absoluteAudioPath);
      } catch {
        throw new AppError(`Unsafe audio path in imported song "${title}".`, 400);
      }
      if (!audioExists) {
        if (mode === 'replace') {
          throw new AppError(`Audio file for "${title}" is missing; library was not changed.`, 400);
        }
        skippedSongs++;
        continue;
      }

      const coverRelativePath = typeof song.coverRelativePath === 'string' && song.coverRelativePath.trim()
        ? song.coverRelativePath.trim()
        : null;
      if (coverRelativePath) {
        try {
          resolveSafeDataPath(coverRelativePath);
        } catch {
          throw new AppError(`Unsafe artwork path in imported song "${title}".`, 400);
        }
      }

      const duration = Number(song.duration ?? 0);
      if (!Number.isFinite(duration) || duration < 0) {
        throw new AppError(`Invalid duration in imported song "${title}".`, 400);
      }
      songsToImport.push({ ...song, id, title, artist, audioRelativePath, coverRelativePath });
    }

    const availableSongIds = new Set(mode === 'merge' ? existingSongIds : []);
    songsToImport.forEach((song) => availableSongIds.add(song.id));
    const existingPlaylists = mode === 'merge'
      ? await prisma.playlist.findMany({ select: { id: true } })
      : [];
    const existingPlaylistIds = new Set(existingPlaylists.map((playlist) => playlist.id));

    const existingUsers = await prisma.user.findMany({ select: { id: true, email: true } });
    const usersByEmail = new Map(existingUsers.map((user) => [user.email.toLowerCase(), user.id]));
    const knownUserIds = new Set(existingUsers.map((user) => user.id));
    const fallbackUserId = await getDefaultLocalUserId();
    const userIdMap = new Map<string, string>();
    for (const user of inputUsers) {
      if (typeof user.id !== 'string') continue;
      const sameId = knownUserIds.has(user.id) ? user.id : undefined;
      const sameEmail = typeof user.email === 'string' ? usersByEmail.get(user.email.toLowerCase()) : undefined;
      userIdMap.set(user.id, sameId || sameEmail || fallbackUserId);
    }
    const mapUserId = (value: unknown): string | null => {
      if (value == null || value === '') return null;
      if (typeof value !== 'string') throw new AppError('Invalid user reference in import.', 400);
      return userIdMap.get(value) || (knownUserIds.has(value) ? value : fallbackUserId);
    };

    const playlistRows = inputPlaylists.filter((playlist) => {
      const id = typeof playlist.id === 'string' ? playlist.id : '';
      const name = typeof playlist.name === 'string' ? playlist.name.trim() : '';
      if (!id || id.length > 191 || !name || name.length > 100) {
        throw new AppError('Library import contains a playlist with invalid fields.', 400);
      }
      return !existingPlaylistIds.has(id);
    });

    const songData = (song: Record<string, unknown> & { id: string; audioRelativePath: string }) => ({
      id: song.id,
      title: song.title as string,
      artist: song.artist as string,
      album: typeof song.album === 'string' ? song.album : null,
      albumArtist: typeof song.albumArtist === 'string' ? song.albumArtist : null,
      genre: typeof song.genre === 'string' ? song.genre : null,
      duration: Number(song.duration || 0),
      trackNumber: Number.isInteger(song.trackNumber) ? Number(song.trackNumber) : null,
      discNumber: Number.isInteger(song.discNumber) ? Number(song.discNumber) : null,
      releaseYear: Number.isInteger(song.releaseYear) ? Number(song.releaseYear) : null,
      composer: typeof song.composer === 'string' ? song.composer : null,
      audioRelativePath: song.audioRelativePath,
      audioFileName: typeof song.audioFileName === 'string' ? song.audioFileName : null,
      coverRelativePath: song.coverRelativePath as string | null,
      coverFileName: typeof song.coverFileName === 'string' ? song.coverFileName : null,
      audioUrl: `/api/songs/${song.id}/audio`,
      coverUrl: song.coverRelativePath ? `/api/songs/${song.id}/artwork` : null,
      mimeType: typeof song.mimeType === 'string' ? song.mimeType : 'audio/mpeg',
      fileSize: Number.isSafeInteger(song.fileSize) && Number(song.fileSize) >= 0 ? Number(song.fileSize) : null,
      fileHash: typeof song.fileHash === 'string' ? song.fileHash : null,
      bitrate: Number.isInteger(song.bitrate) && Number(song.bitrate) >= 0 ? Number(song.bitrate) : null,
      originalFileName: typeof song.originalFileName === 'string' ? song.originalFileName : null,
      isDownloadable: song.isDownloadable !== false,
      ...(song.userId != null ? { user: { connect: { id: mapUserId(song.userId)! } } } : {}),
    });

    await prisma.$transaction(async (tx) => {
      if (mode === 'replace') {
        await tx.playHistory.deleteMany();
        await tx.favorite.deleteMany();
        await tx.playlistSong.deleteMany();
        await tx.playlist.deleteMany();
        await tx.song.deleteMany();
      }

      for (const song of songsToImport) {
        await tx.song.create({ data: songData(song) });
      }

      for (const playlist of playlistRows) {
        const playlistId = playlist.id as string;
        const links = Array.isArray(playlist.songs) ? playlist.songs : [];
        const seenLinks = new Set<string>();
        const songs = links.flatMap((link, index) => {
          const row = typeof link === 'string' ? { songId: link } : link as Record<string, unknown>;
          const songId = typeof row.songId === 'string' ? row.songId : '';
          if (!songId || !availableSongIds.has(songId) || seenLinks.has(songId)) return [];
          seenLinks.add(songId);
          return [{ songId, position: Number.isInteger(row.position) ? Number(row.position) : index }];
        });
        await tx.playlist.create({
          data: {
            id: playlistId,
            name: playlist.name as string,
            description: typeof playlist.description === 'string' ? playlist.description : null,
            coverUrl: typeof playlist.coverUrl === 'string' ? playlist.coverUrl : null,
            userId: mapUserId(playlist.userId),
            ...(songs.length
              ? {
                  songs: {
                    create: songs.map(({ songId, position }) => ({
                      position,
                      song: { connect: { id: songId } },
                    })),
                  },
                }
              : {}),
          },
        });
      }

      const favorites = inputFavorites.flatMap((favorite) => {
        const songId = typeof favorite.songId === 'string' ? favorite.songId : '';
        if (!availableSongIds.has(songId)) return [];
        return [{ songId, userId: mapUserId(favorite.userId) || fallbackUserId }];
      });
      for (const favorite of favorites) {
        await tx.favorite.upsert({
          where: { userId_songId: { userId: favorite.userId, songId: favorite.songId } },
          create: favorite,
          update: {},
        });
      }

      const history = inputHistory.flatMap((item) => {
        const songId = typeof item.songId === 'string' ? item.songId : '';
        if (!availableSongIds.has(songId)) return [];
        const durationPlayed = item.durationPlayed == null ? null : Number(item.durationPlayed);
        if (durationPlayed !== null && (!Number.isFinite(durationPlayed) || durationPlayed < 0)) return [];
        const playedAt = item.playedAt ? new Date(String(item.playedAt)) : new Date();
        if (!Number.isFinite(playedAt.getTime())) return [];
        return [{ songId, userId: mapUserId(item.userId), durationPlayed, playedAt }];
      });
      if (history.length) await tx.playHistory.createMany({ data: history });
    });

    const importedSongs = songsToImport.length;
    const importedPlaylists = playlistRows.length;
    logger.info(`Library import complete: ${importedSongs} songs, ${importedPlaylists} playlists`);
    return { importedSongs, importedPlaylists, skippedSongs, mode };
  }
}
