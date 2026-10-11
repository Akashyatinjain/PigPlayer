const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const projectRoot = path.resolve(__dirname, '../..');
const dataDir = path.resolve(projectRoot, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure SQLite database URL
const dbPath = path.resolve(dataDir, 'soundify.db');
const normalizedPath = dbPath.split(path.sep).join('/');
const sqliteUrl = `file:${normalizedPath}`;

// Always force SQLite URL so remote postgres URLs in Render env do not crash Prisma
const safeEnv = {
  ...process.env,
  DATABASE_URL: sqliteUrl,
};

console.log('[prisma-safe] Using SQLite URL for Prisma:', sqliteUrl);

try {
  console.log('[prisma-safe] Running prisma generate...');
  execSync('npx prisma generate', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: safeEnv,
  });

  console.log('[prisma-safe] Running prisma db push...');
  execSync('npx prisma db push --skip-generate', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: safeEnv,
  });

  console.log('[prisma-safe] Database is ready and synchronized.');
} catch (err) {
  console.error('[prisma-safe] Error executing prisma:', err.message);
  process.exit(1);
}
