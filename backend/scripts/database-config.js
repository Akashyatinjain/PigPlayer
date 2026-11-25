const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const backendRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const parent = path.dirname(backendRoot);
const projectRoot = fs.existsSync(path.join(parent, 'frontend')) ||
  fs.existsSync(path.join(parent, 'data')) ? parent : backendRoot;
const configuredDataRoot = process.env.DATA_DIR?.trim() || process.env.DATA_ROOT?.trim();
const dataRoot = path.resolve(configuredDataRoot || path.join(projectRoot, 'data'));
const defaultPath = path.join(dataRoot, 'soundify.db');
const sqlitePath = process.env.SQLITE_PATH?.trim();
const sqliteUrl = process.env.SQLITE_DATABASE_URL?.trim();
const configuredUrl = sqliteUrl || process.env.DATABASE_URL?.trim();
const urlName = sqliteUrl ? 'SQLITE_DATABASE_URL' : 'DATABASE_URL';

let databasePath;
if (sqlitePath) {
  databasePath = path.resolve(sqlitePath);
} else if (!configuredUrl) {
  databasePath = defaultPath;
} else if (/^(file:|sqlite:)/i.test(configuredUrl)) {
  let localPath = configuredUrl.replace(/^sqlite:\/\//i, 'file:').replace(/^(file|sqlite):/i, '');
  if (process.platform === 'win32') localPath = localPath.replace(/^\/([a-z]:[\\/])/i, '$1');
  if (!localPath || localPath === ':memory:' || /[?#]/.test(localPath)) {
    throw new Error(`${urlName} must identify a persistent SQLite file. Use SQLITE_PATH for a literal path.`);
  }
  databasePath = path.resolve(backendRoot, 'prisma', localPath);
} else if (!sqliteUrl && path.isAbsolute(configuredUrl)) {
  databasePath = path.resolve(configuredUrl);
} else if (!sqliteUrl && process.env.RENDER === 'true' && /^postgres(?:ql)?:\/\//i.test(configuredUrl) &&
    (configuredDataRoot || fs.statSync(defaultPath, { throwIfNoEntry: false })?.isFile())) {
  console.warn('[CONFIG] Ignoring PostgreSQL DATABASE_URL on Render and using the local SQLite library.');
  databasePath = defaultPath;
} else {
  throw new Error(`${urlName} must use a SQLite file URL. Set SQLITE_PATH to the intended SQLite database file.`);
}
if (/[?#]/.test(databasePath)) throw new Error('SQLite database paths cannot contain ? or #');

const databaseUrl = `file:${databasePath.split(path.sep).join('/')}`;
module.exports = { backendRoot, projectRoot, dataRoot, databasePath, databaseUrl };
