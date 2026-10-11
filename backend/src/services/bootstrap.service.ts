import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { config } from '../config/env';
import { ensureStorageDirectories } from '../config/paths';
import { logger } from '../utils/logger';

/**
 * First-run bootstrap: directories, default local user.
 */
async function ensureDatabaseSchema(): Promise<void> {
  try {
    await prisma.$queryRawUnsafe('SELECT 1 FROM "User" LIMIT 1;');
  } catch {
    logger.info('Database tables missing or empty. Auto-initializing schema...');
    let pushed = false;
    try {
      const { execSync } = await import('child_process');
      const path = await import('path');
      const backendRoot = path.resolve(__dirname, '../../');
      execSync('npx prisma db push --skip-generate', {
        cwd: backendRoot,
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: config.databaseUrl },
      });
      pushed = true;
      logger.info('Database schema pushed successfully via Prisma CLI');
    } catch (cliErr) {
      logger.warn(`Prisma CLI auto-push failed, running raw SQL table creation: ${String(cliErr)}`);
    }

    if (!pushed) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "email" TEXT UNIQUE NOT NULL,
          "password" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "avatar" TEXT,
          "role" TEXT NOT NULL DEFAULT 'user',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "Song" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "title" TEXT NOT NULL,
          "artist" TEXT NOT NULL,
          "album" TEXT,
          "albumArtist" TEXT,
          "genre" TEXT,
          "duration" REAL NOT NULL DEFAULT 0,
          "trackNumber" INTEGER,
          "discNumber" INTEGER,
          "releaseYear" INTEGER,
          "composer" TEXT,
          "audioFileName" TEXT,
          "audioRelativePath" TEXT NOT NULL,
          "coverFileName" TEXT,
          "coverRelativePath" TEXT,
          "audioUrl" TEXT NOT NULL DEFAULT '',
          "coverUrl" TEXT,
          "mimeType" TEXT,
          "fileSize" INTEGER,
          "fileHash" TEXT,
          "bitrate" INTEGER,
          "originalFileName" TEXT,
          "isDownloadable" BOOLEAN NOT NULL DEFAULT 1,
          "userId" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS "Playlist" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "coverUrl" TEXT,
          "userId" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS "PlaylistSong" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "playlistId" TEXT NOT NULL,
          "songId" TEXT NOT NULL,
          "position" INTEGER NOT NULL DEFAULT 0,
          "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("playlistId", "songId"),
          FOREIGN KEY ("playlistId") REFERENCES "Playlist" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS "Favorite" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "userId" TEXT NOT NULL,
          "songId" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("userId", "songId"),
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS "PlayHistory" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "userId" TEXT,
          "songId" TEXT NOT NULL,
          "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "durationPlayed" REAL,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE
        );
      `);
      logger.info('Database tables created successfully via raw SQL fallback');
    }
  }
}

/**
 * First-run bootstrap: directories, schema verification, default users.
 */
export async function bootstrapLocalApp(): Promise<void> {
  ensureStorageDirectories();
  logger.info('Storage directories verified');

  await ensureDatabaseSchema();

  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
  } catch (err) {
    logger.warn(`Could not set SQLite pragmas: ${String(err)}`);
  }

  const email = config.localUser.email;
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const hashed = await bcrypt.hash(config.localUser.password, 10);
    await prisma.user.create({
      data: {
        email,
        name: config.localUser.name,
        password: hashed,
        role: 'admin',
      },
    });
    logger.info(`Default local user created: ${email}`);
  } else {
    if (config.env === 'production' && existing.role !== 'admin') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'admin' } });
    }
    logger.info(`Default local user ready: ${email}`);
  }

  // Ensure demo accounts exist for UI demo login
  const demoAccounts = [
    { email: 'demo@piggyplayer.app', name: 'Demo User', password: 'password123' },
    { email: 'demo@soundify.app', name: 'Demo Listener', password: 'password123' },
  ];

  for (const demo of demoAccounts) {
    try {
      const demoExisting = await prisma.user.findUnique({ where: { email: demo.email } });
      if (!demoExisting) {
        const demoHashed = await bcrypt.hash(demo.password, 10);
        await prisma.user.create({
          data: {
            email: demo.email,
            name: demo.name,
            password: demoHashed,
            role: 'user',
          },
        });
        logger.info(`Demo user created: ${demo.email}`);
      }
    } catch {
      // Ignore if exists
    }
  }
}

export async function getDefaultLocalUserId(): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email: config.localUser.email },
  });
  if (!user) {
    await bootstrapLocalApp();
    const created = await prisma.user.findUnique({
      where: { email: config.localUser.email },
    });
    if (!created) throw new Error('Failed to create default local user');
    return created.id;
  }
  return user.id;
}
