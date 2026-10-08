import dotenv from 'dotenv';
import path from 'path';
import { DB_PATH } from './paths';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const defaultDatabaseUrl = `file:${DB_PATH.split(path.sep).join('/')}`;
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function getSecret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET', devFallback: string): string {
  const value = process.env[name]?.trim();
  if (isProduction && (!value || value.length < 32)) {
    throw new Error(`${name} must be configured with at least 32 characters in production`);
  }
  return value || devFallback;
}

const databaseUrl = process.env.DATABASE_URL?.trim() || defaultDatabaseUrl;
if (!databaseUrl.startsWith('file:')) {
  throw new Error('DATABASE_URL must point to a local SQLite file (file:...).');
}

const maxUploadMb = Number.parseInt(process.env.MAX_UPLOAD_MB || '100', 10);
if (!Number.isFinite(maxUploadMb) || maxUploadMb < 1 || maxUploadMb > 100) {
  throw new Error('MAX_UPLOAD_MB must be an integer between 1 and 100');
}

const port = Number.parseInt(process.env.PORT || '5000', 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port');
}

const localUserPassword = process.env.LOCAL_USER_PASSWORD || 'soundify';
if (isProduction && (localUserPassword.length < 12 || localUserPassword === 'soundify')) {
  throw new Error('LOCAL_USER_PASSWORD must be changed to a strong password in production');
}

export const config = {
  env: nodeEnv,
  port,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  allowedOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
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
