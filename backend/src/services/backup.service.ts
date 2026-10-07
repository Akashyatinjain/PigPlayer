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
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
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

      const stagedDb = path.join(staging, 'soundify.db');
      const stagedLibrary = path.join(staging, 'library.json');

      if (!confirmReplace) {
        return {
          preview: true,
          message:
            'Backup extracted for preview. Pass confirmReplace=true to apply (current DB will be copied aside first).',
          hasDatabase: fs.existsSync(stagedDb),
          hasLibraryJson: fs.existsSync(stagedLibrary),
          stagingDir: path.basename(staging),
        };
      }

      // Safety copy of current DB
      if (fs.existsSync(DB_PATH)) {
        const safety = path.join(
          BACKUPS_DIR,
          `pre-restore-${Date.now()}.db`
        );
        await fs.promises.copyFile(DB_PATH, safety);
      }

      if (fs.existsSync(stagedDb)) {
        await prisma.$disconnect();
        await fs.promises.copyFile(stagedDb, DB_PATH);
      }

      // Restore media folders if present
      for (const folder of ['audio', 'artwork'] as const) {
        const src = path.join(staging, folder);
        if (fs.existsSync(src)) {
          const dest = resolveSafeDataPath(folder);
          await fs.promises.cp(src, dest, { recursive: true });
        }
      }

      logger.info(`Backup restored from: ${safeName}`);
      return {
        preview: false,
        restored: true,
        fileName: safeName,
        message: 'Backup restored. Restart the backend if connections fail.',
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
    payload: {
      songs?: Array<Record<string, unknown>>;
      playlists?: Array<Record<string, unknown>>;
      favorites?: Array<Record<string, unknown>>;
      history?: Array<Record<string, unknown>>;
    },
    mode: 'merge' | 'replace' = 'merge'
  ) {
    if (mode === 'replace') {
      await prisma.$transaction([
        prisma.playHistory.deleteMany(),
        prisma.favorite.deleteMany(),
        prisma.playlistSong.deleteMany(),
        prisma.playlist.deleteMany(),
        prisma.song.deleteMany(),
      ]);
    }

    let importedSongs = 0;
    if (payload.songs?.length) {
      for (const song of payload.songs) {
        const id = String(song.id || '');
        const audioRelativePath = String(song.audioRelativePath || '');
        if (!id || !audioRelativePath) continue;

        const exists = await prisma.song.findUnique({ where: { id } });
        if (exists && mode === 'merge') continue;

        await prisma.song.upsert({
          where: { id },
          create: {
            id,
            title: String(song.title || 'Unknown'),
            artist: String(song.artist || 'Unknown'),
            album: (song.album as string) || null,
            albumArtist: (song.albumArtist as string) || null,
            genre: (song.genre as string) || null,
            duration: Number(song.duration) || 0,
            trackNumber: song.trackNumber != null ? Number(song.trackNumber) : null,
            discNumber: song.discNumber != null ? Number(song.discNumber) : null,
            releaseYear: song.releaseYear != null ? Number(song.releaseYear) : null,
            composer: (song.composer as string) || null,
            audioRelativePath,
            audioFileName: (song.audioFileName as string) || null,
            coverRelativePath: (song.coverRelativePath as string) || null,
            coverFileName: (song.coverFileName as string) || null,
            audioUrl: `/api/songs/${id}/audio`,
            coverUrl: song.coverRelativePath ? `/api/songs/${id}/artwork` : null,
            mimeType: (song.mimeType as string) || 'audio/mpeg',
            fileSize: song.fileSize != null ? Number(song.fileSize) : null,
            fileHash: (song.fileHash as string) || null,
            bitrate: song.bitrate != null ? Number(song.bitrate) : null,
            originalFileName: (song.originalFileName as string) || null,
            isDownloadable: song.isDownloadable !== false,
          },
          update: {},
        });
        importedSongs++;
      }
    }

    logger.info(`Library import complete: ${importedSongs} songs`);
    return { importedSongs, mode };
  }
}
