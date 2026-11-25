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
const databaseProvider = process.env.DATABASE_PROVIDER?.trim() || 'sqlite';
const genericUrl = process.env.DATABASE_URL?.trim();
const sqlitePath = databaseProvider === 'sqlite' ? process.env.SQLITE_PATH?.trim() : undefined;
const sqliteUrl = databaseProvider === 'sqlite' ? process.env.SQLITE_DATABASE_URL?.trim() : undefined;
const configuredUrl = databaseProvider === 'sqlite' ? sqliteUrl || genericUrl : undefined;
const urlName = sqliteUrl ? 'SQLITE_DATABASE_URL' : 'DATABASE_URL';

if (!['sqlite', 'postgresql'].includes(databaseProvider)) {
  throw new Error('DATABASE_PROVIDER must be sqlite or postgresql.');
}

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

function readPostgresUrl(raw, name) {
  try {
    const url = new URL(raw);
    if (['postgres:', 'postgresql:'].includes(url.protocol) && url.hostname && url.pathname.length > 1) return url;
  } catch {
    // Report only the setting name because the URL can contain credentials.
  }
  throw new Error(`${name} must be a PostgreSQL connection URL with a database name.`);
}

let databaseUrl = `file:${databasePath.split(path.sep).join('/')}`;
let databaseMigrationUrl = databaseUrl;
if (databaseProvider === 'postgresql') {
  const runtime = readPostgresUrl(genericUrl, 'DATABASE_URL');
  const directUrl = process.env.DIRECT_URL?.trim();
  const direct = directUrl ? readPostgresUrl(directUrl, 'DIRECT_URL') : new URL(runtime);
  if (runtime.hostname.endsWith('.neon.tech')) {
    const expectedHost = runtime.hostname.replace(/-pooler(?=\.)/, '');
    if (!directUrl) direct.hostname = expectedHost;
    if (direct.hostname !== expectedHost) {
      throw new Error('DIRECT_URL must use the unpooled endpoint for the same Neon branch as DATABASE_URL.');
    }
  }
  if (direct.pathname !== runtime.pathname ||
      (direct.searchParams.get('schema') || 'public') !== (runtime.searchParams.get('schema') || 'public')) {
    throw new Error('DIRECT_URL and DATABASE_URL must select the same database and schema.');
  }
  databaseUrl = runtime.toString();
  databaseMigrationUrl = direct.toString();
}

module.exports = { backendRoot, projectRoot, dataRoot, databasePath, databaseProvider, databaseUrl, databaseMigrationUrl };
