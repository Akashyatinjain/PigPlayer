const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const backendRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const parent = path.dirname(backendRoot);
const projectRoot = fs.existsSync(path.join(parent, 'frontend')) ||
  fs.existsSync(path.join(parent, 'data')) ? parent : backendRoot;
const dataRoot = path.resolve(process.env.DATA_DIR || process.env.DATA_ROOT || path.join(projectRoot, 'data'));
const defaultPath = path.join(dataRoot, 'soundify.db');
const configuredUrl = (process.env.DATABASE_URL || process.env.SQLITE_DATABASE_URL || '').trim();

let databasePath;
if (process.env.SQLITE_PATH) {
  databasePath = path.resolve(process.env.SQLITE_PATH);
} else if (!configuredUrl) {
  databasePath = defaultPath;
} else if (/^(file:|sqlite:)/i.test(configuredUrl)) {
  let localPath = configuredUrl.replace(/^sqlite:\/\//i, 'file:').replace(/^(file|sqlite):/i, '');
  if (process.platform === 'win32') localPath = localPath.replace(/^\/([a-z]:[\\/])/i, '$1');
  if (!localPath || localPath === ':memory:' || /[?#]/.test(localPath)) {
    throw new Error('DATABASE_URL must identify a persistent SQLite file. Use SQLITE_PATH for a literal path.');
  }
  databasePath = path.resolve(backendRoot, 'prisma', localPath);
} else {
  throw new Error('DATABASE_URL must use a SQLite file URL. Set SQLITE_PATH to specify a filesystem path.');
}
if (/[?#]/.test(databasePath)) throw new Error('SQLite database paths cannot contain ? or #');

const databaseUrl = `file:${databasePath.split(path.sep).join('/')}`;
module.exports = { backendRoot, projectRoot, dataRoot, databasePath, databaseUrl };
