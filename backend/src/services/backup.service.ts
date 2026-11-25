import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { prisma } from '../config/database';
import { config } from '../config/env';
import {
  BACKUPS_DIR,
  AUDIO_DIR,
  ARTWORK_DIR,
  ensureStorageDirectories,
  resolveMediaPath,
  toPosixRelative,
} from '../config/paths';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { SongRepository } from '../repositories/song.repository';
import { extractBackupArchive, writeBackupArchive } from './storage/backup-archive';

export class BackupService {
  static async listBackups() {
    ensureStorageDirectories();
    const files = await fs.promises.readdir(BACKUPS_DIR, { withFileTypes: true });
    const backups = await Promise.all(
      files
        .filter((entry) => entry.isFile() && entry.name.endsWith('.zip'))
        .map(async ({ name: fileName }) => {
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
    const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `soundify-backup-${stamp}-${randomUUID()}.zip`;
    const outPath = path.join(BACKUPS_DIR, fileName);
    const staging = await fs.promises.mkdtemp(path.join(BACKUPS_DIR, '.backup-'));
    try {
      const [songs, playlists, favorites, history, users] = await prisma.$transaction([
        prisma.song.findMany(),
        prisma.playlist.findMany({ include: { songs: true } }),
        prisma.favorite.findMany(),
        prisma.playHistory.findMany(),
        prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true } }),
      ], { isolationLevel: 'Serializable' });
      const library = { version: 1, exportedAt: new Date().toISOString(), songs, playlists, favorites, history, users };
      const snapshotPath = config.databaseProvider === 'sqlite' ? path.join(staging, 'soundify.db') : undefined;
      if (snapshotPath) await prisma.$executeRaw`VACUUM INTO ${snapshotPath}`;
      const tempZip = path.join(staging, 'backup.zip');
      await writeBackupArchive(tempZip, library, snapshotPath, includeMedia ? [
        { folder: 'audio', source: AUDIO_DIR }, { folder: 'artwork', source: ARTWORK_DIR },
      ] : []);
      const stat = await fs.promises.stat(tempZip);
      await fs.promises.rename(tempZip, outPath);
      return { fileName, size: stat.size, path: `backups/${fileName}`, includeMedia };
    } finally {
      await fs.promises.rm(staging, { recursive: true, force: true }).catch(() => logger.warn('Could not clean backup staging directory'));
    }
  }

  static async restoreBackup(fileName: string, confirmReplace: boolean, actorId: string) {
    ensureStorageDirectories();
    if (!/^[a-zA-Z0-9._-]+\.zip$/.test(fileName) || fileName.length > 200) {
      throw new AppError('Invalid backup file name', 400);
    }

    const zipPath = path.join(BACKUPS_DIR, fileName);
    const zipInfo = await fs.promises.lstat(zipPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
    if (!zipInfo?.isFile()) throw new AppError('Backup not found', 404);

    const staging = await fs.promises.mkdtemp(path.join(BACKUPS_DIR, '.restore-'));
    const copiedMedia: string[] = [];
    let imported = false;
    try {
      await extractBackupArchive(zipPath, staging);
      let snapshot: Record<string, unknown>;
      try {
        const parsed = JSON.parse(await fs.promises.readFile(path.join(staging, 'library.json'), 'utf-8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected object');
        snapshot = parsed;
      } catch {
        throw new AppError('Backup library snapshot is missing or invalid.', 400);
      }
      const songs = Array.isArray(snapshot.songs) ? snapshot.songs : null;
      if (!songs || !['playlists', 'favorites', 'history'].every((key) => Array.isArray(snapshot[key]))) {
        throw new AppError('Backup library snapshot has an invalid format.', 400);
      }

      if (!confirmReplace) {
        return {
          preview: true,
          message: 'Snapshot validated. Confirm replacement to apply this library backup.',
          hasDatabase: false,
          hasLibraryJson: true,
          songCount: songs.length,
          playlistCount: (snapshot.playlists as unknown[]).length,
          hasAudio: fs.existsSync(path.join(staging, 'audio')),
          hasArtwork: fs.existsSync(path.join(staging, 'artwork')),
        };
      }

      const safetyBackup = await this.createBackup({ includeMedia: true });
      const restoredPaths = new Map<string, string>();
      for (const song of songs) {
        if (!song || typeof song !== 'object') continue;
        for (const [key, folder] of [['audioRelativePath', 'audio'], ['coverRelativePath', 'artwork']] as const) {
          const relative = song[key];
          if (typeof relative !== 'string' || relative.startsWith('demo/')) continue;
          let target: string;
          try {
            target = resolveMediaPath(relative, folder);
          } catch {
            throw new AppError('Backup contains an invalid media path.', 400);
          }
          const filename = path.basename(target);
          const source = path.join(staging, folder, filename);
          if (!fs.existsSync(source)) continue;
          let restoredPath = restoredPaths.get(target);
          if (!restoredPath) {
            const destination = resolveMediaPath(`${folder}/restored_${randomUUID()}${path.extname(filename)}`, folder);
            await fs.promises.copyFile(source, destination, fs.constants.COPYFILE_EXCL);
            copiedMedia.push(destination);
            restoredPath = toPosixRelative(destination);
            restoredPaths.set(target, restoredPath);
          }
          song[key] = restoredPath;
          song[folder === 'audio' ? 'audioFileName' : 'coverFileName'] = path.basename(restoredPath);
        }
      }
      const importResult = await this.importLibraryJson(snapshot, 'replace', actorId);
      imported = true;
      return {
        preview: false, restored: true, fileName, safetyBackup: safetyBackup.fileName,
        ...importResult, message: 'Backup restored successfully. A safety backup was created first.',
      };
    } finally {
      if (!imported) {
        for (const target of copiedMedia) {
          await fs.promises.unlink(target).catch(() => logger.warn('Could not remove unused restored media'));
        }
      }
      await fs.promises.rm(staging, { recursive: true, force: true }).catch(() => logger.warn('Could not clean restore staging directory'));
    }
  }

  static async exportLibraryJson(actorId: string) {
    const [songs, playlists, favorites, history] = await prisma.$transaction([
      prisma.song.findMany(),
      prisma.playlist.findMany({ include: { songs: true } }),
      prisma.favorite.findMany(),
      prisma.playHistory.findMany(),
    ]);

    const stats = await SongRepository.getLibraryStats(actorId, true);

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
    mode: 'merge' | 'replace',
    actorId: string,
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
    const inputUsers = payload.users === undefined ? [] : readRows('users');

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

      let audioExists = false;
      try {
        const absoluteAudioPath = /^demo\/[\w.-]+\.wav$/.test(audioRelativePath)
          ? path.resolve(__dirname, '../../public', audioRelativePath)
          : resolveMediaPath(audioRelativePath, 'audio');
        audioExists = fs.statSync(absoluteAudioPath, { throwIfNoEntry: false })?.isFile() ?? false;
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
          if (!/^demo\/covers\/[\w.-]+\.svg$/.test(coverRelativePath)) resolveMediaPath(coverRelativePath, 'artwork');
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
    const fallbackUserId = actorId;
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

    const seenPlaylistIds = new Set<string>();
    const playlistRows = inputPlaylists.filter((playlist) => {
      const id = typeof playlist.id === 'string' ? playlist.id : '';
      const name = typeof playlist.name === 'string' ? playlist.name.trim() : '';
      if (!id || id.length > 191 || !name || name.length > 100 || seenPlaylistIds.has(id)) {
        throw new AppError('Library import contains a playlist with invalid fields.', 400);
      }
      seenPlaylistIds.add(id);
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
          if (!link || (typeof link !== 'string' && (typeof link !== 'object' || Array.isArray(link)))) {
            throw new AppError('Invalid playlist song reference.', 400);
          }
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

      const seenHistory = new Set<string>();
      const history = inputHistory.flatMap((item) => {
        const songId = typeof item.songId === 'string' ? item.songId : '';
        if (!availableSongIds.has(songId)) return [];
        const durationPlayed = item.durationPlayed == null ? null : Number(item.durationPlayed);
        if (durationPlayed !== null && (!Number.isFinite(durationPlayed) || durationPlayed < 0)) return [];
        const playedAt = item.playedAt ? new Date(String(item.playedAt)) : new Date();
        if (!Number.isFinite(playedAt.getTime())) return [];
        const id = typeof item.id === 'string' && item.id.length <= 191 ? item.id : undefined;
        if (id && seenHistory.has(id)) return [];
        if (id) seenHistory.add(id);
        return [{ id, songId, userId: mapUserId(item.userId), durationPlayed, playedAt }];
      });
      if (history.length) {
        const existing = new Set<string>();
        const ids = [...seenHistory];
        if (mode === 'merge') {
          for (let offset = 0; offset < ids.length; offset += 500) {
            const rows = await tx.playHistory.findMany({
              where: { id: { in: ids.slice(offset, offset + 500) } },
              select: { id: true },
            });
            for (const row of rows) existing.add(row.id);
          }
        }
        await tx.playHistory.createMany({ data: history.filter((item) => !item.id || !existing.has(item.id)) });
      }
    }, { timeout: 30_000 });

    const importedSongs = songsToImport.length;
    const importedPlaylists = playlistRows.length;
    logger.info(`Library import complete: ${importedSongs} songs, ${importedPlaylists} playlists`);
    return { importedSongs, importedPlaylists, skippedSongs, mode };
  }
}
