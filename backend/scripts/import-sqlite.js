const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient: SQLiteClient } = require('@prisma/client');
const { PrismaClient: PostgresClient } = require('.prisma/postgresql-client');
const { backendRoot, databaseMigrationUrl, databaseProvider } = require('./database-config');
const { resolveMediaPath } = require('../dist/config/paths');

// In dependency order so parent records exist before their foreign keys are inserted.
const models = ['user', 'song', 'playlist', 'playlistSong', 'favorite', 'playHistory', 'authSession'];

function hasMedia(relativePath, folder) {
  try {
    const bundled = /^demo\/(?:covers\/)?[\w.-]+$/.test(relativePath);
    const absolute = bundled
      ? path.join(backendRoot, 'public', relativePath)
      : resolveMediaPath(relativePath, folder);
    return fs.statSync(absolute).isFile();
  } catch {
    return false;
  }
}

async function main() {
  const [sourceFile, flag, ...extra] = process.argv.slice(2);
  if (!sourceFile || (flag && flag !== '--apply') || extra.length) {
    throw new Error('Usage: npm run db:import-sqlite -- <source SQLite file> [--apply]');
  }
  if (databaseProvider !== 'postgresql') {
    throw new Error('Set DATABASE_PROVIDER=postgresql and configure DATABASE_URL before importing.');
  }
  const sourcePath = path.resolve(sourceFile);
  if (!fs.statSync(sourcePath, { throwIfNoEntry: false })?.isFile() || /[?#]/.test(sourcePath)) {
    throw new Error('Provide the existing SQLite database file as the source.');
  }

  const source = new SQLiteClient({ datasources: { db: { url: `file:${sourcePath.split(path.sep).join('/')}` } } });
  const target = new PostgresClient({ datasources: { db: { url: databaseMigrationUrl } } });
  try {
    const snapshot = await source.$transaction(async (tx) => {
      await tx.$executeRaw`PRAGMA query_only = ON`;
      const sessionTable = await tx.$queryRaw`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'AuthSession'`;
      const result = {};
      for (const model of models) {
        result[model] = model === 'authSession' && !sessionTable.length ? [] : await tx[model].findMany();
      }
      return result;
    }, { timeout: 120_000 });

    const unavailable = snapshot.song.filter((song) =>
      !hasMedia(song.audioRelativePath, 'audio') ||
      (song.coverRelativePath && !hasMedia(song.coverRelativePath, 'artwork')));
    if (unavailable.length) {
      throw new Error(`Media for ${unavailable.length} song(s) is missing or invalid. Check DATA_ROOT before importing.`);
    }

    await target.$transaction(async (tx) => {
      for (const model of models) {
        if (await tx[model].count()) {
          throw new Error('The PostgreSQL library already has records. Import requires an empty PigPlayer schema.');
        }
      }
      if (flag === '--apply') {
        for (const model of models) {
          if (!snapshot[model].length) continue;
          const { count } = await tx[model].createMany({ data: snapshot[model] });
          if (count !== snapshot[model].length) throw new Error(`Unexpected row count for ${model}.`);
        }
      }
    }, { isolationLevel: 'Serializable', timeout: 120_000 });

    const counts = Object.fromEntries(models.map((model) => [model, snapshot[model].length]));
    console.log(flag === '--apply' ? 'Imported SQLite library into PostgreSQL.' : 'Import preflight passed. Use --apply to import.');
    console.log(counts);
  } finally {
    await Promise.allSettled([source.$disconnect(), target.$disconnect()]);
  }
}

main().catch((error) => {
  if (error.clientVersion) {
    console.error(`Database operation failed (${error.code || error.errorCode || 'connection'}). Check the source schema and PostgreSQL settings.`);
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
});
