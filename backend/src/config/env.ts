import dotenv from 'dotenv';
import path from 'path';
import { DB_PATH } from './paths';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const defaultDatabaseUrl = `file:${DB_PATH.split(path.sep).join('/')}`;
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function getSecret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET', devFallback: string): string {
  let value = process.env[name]?.trim();
  if (value && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
    value = value.slice(1, -1).trim();
  }
  if (!value || value.length < 32) {
    if (isProduction && !value) {
      console.warn(`[CONFIG] ${name} is not configured in production. Using fallback secret.`);
    }
    return value && value.length >= 16 ? value : devFallback;
  }
  return value;
}

function resolveDatabaseUrl(): string {
  let raw = (process.env.DATABASE_URL || process.env.SQLITE_DATABASE_URL || '').trim();

  // Strip enclosing single or double quotes
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }

  // If empty, use default SQLite URL
  if (!raw) {
    process.env.DATABASE_URL = defaultDatabaseUrl;
    return defaultDatabaseUrl;
  }

  // If a remote cloud database URL is provided (e.g. Render auto-injected postgres:// or postgresql://),
  // Soundify is an offline-first SQLite application.
  // Gracefully fall back to local SQLite at defaultDatabaseUrl instead of crashing.
  if (
    raw.startsWith('postgres://') ||
    raw.startsWith('postgresql://') ||
    raw.startsWith('mysql://') ||
    raw.startsWith('mongodb://')
  ) {
    console.warn(
      `[CONFIG] Non-SQLite database URL detected in DATABASE_URL (${raw.split('://')[0]}://...). Soundify runs on local SQLite; falling back to local SQLite database at ${defaultDatabaseUrl}.`
    );
    process.env.DATABASE_URL = defaultDatabaseUrl;
    return defaultDatabaseUrl;
  }

  // Normalize sqlite: or sqlite3: prefixes
  if (raw.startsWith('sqlite:///')) {
    raw = `file:/${raw.slice('sqlite:///'.length)}`;
  } else if (raw.startsWith('sqlite://')) {
    raw = `file:${raw.slice('sqlite://'.length)}`;
  } else if (raw.startsWith('sqlite:')) {
    raw = `file:${raw.slice('sqlite:'.length)}`;
  }

  // If bare filesystem path (e.g. /var/data/soundify.db or ./data/soundify.db)
  if (!raw.startsWith('file:') && !raw.includes('://')) {
    const resolvedPath = path.resolve(raw).split(path.sep).join('/');
    raw = `file:${resolvedPath}`;
  }

  // Ensure it starts with file:
  if (!raw.startsWith('file:')) {
    console.warn(
      `[CONFIG] Invalid DATABASE_URL scheme ("${raw}"). Defaulting to local SQLite at ${defaultDatabaseUrl}.`
    );
    process.env.DATABASE_URL = defaultDatabaseUrl;
    return defaultDatabaseUrl;
  }

  process.env.DATABASE_URL = raw;
  return raw;
}

const databaseUrl = resolveDatabaseUrl();

const maxUploadMb = Number.parseInt(process.env.MAX_UPLOAD_MB || '100', 10);
if (!Number.isFinite(maxUploadMb) || maxUploadMb < 1 || maxUploadMb > 100) {
  throw new Error('MAX_UPLOAD_MB must be an integer between 1 and 100');
}

const port = Number.parseInt(process.env.PORT || '5000', 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port');
}

let localUserPassword = process.env.LOCAL_USER_PASSWORD?.trim() || 'soundify';
if ((localUserPassword.startsWith('"') && localUserPassword.endsWith('"')) || (localUserPassword.startsWith("'") && localUserPassword.endsWith("'"))) {
  localUserPassword = localUserPassword.slice(1, -1).trim();
}

export function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return '';
  if (trimmed === '*') return '*';
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

const configuredClientUrl = process.env.CLIENT_URL ? normalizeOrigin(process.env.CLIENT_URL) : 'http://localhost:3000';
const configuredAllowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim().replace(/^["']|["']$/g, ''))
  .filter(Boolean)
  .map(normalizeOrigin)
  .filter(Boolean);

export const config = {
  env: nodeEnv,
  port,
  clientUrl: configuredClientUrl,
  allowedOrigins: configuredAllowedOrigins,
  databaseUrl,
  jwt: {
    secret: getSecret('JWT_SECRET', 'soundify-local-jwt-secret-offline-2026'),
    refreshSecret: getSecret('JWT_REFRESH_SECRET', 'soundify-local-refresh-secret-offline-2026'),
    expiresIn: '24h' as const,
    refreshExpiresIn: '7d' as const,
  },
  localUser: {
    email: process.env.LOCAL_USER_EMAIL || 'local@soundify.app',
    password: localUserPassword,
    name: process.env.LOCAL_USER_NAME || 'Local User',
  },
  upload: {
    maxFileSizeMb: maxUploadMb,
    allowedAudioExt: ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac'] as const,
  },
};
