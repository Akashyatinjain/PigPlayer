import dotenv from 'dotenv';
import path from 'path';
import { DB_PATH } from './paths';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const defaultDatabaseUrl = `file:${DB_PATH.split(path.sep).join('/')}`;

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || defaultDatabaseUrl,
  jwt: {
    secret: process.env.JWT_SECRET || 'soundify-local-jwt-secret-offline-2026',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'soundify-local-refresh-secret-offline-2026',
    expiresIn: '24h' as const,
    refreshExpiresIn: '7d' as const,
  },
  localUser: {
    email: process.env.LOCAL_USER_EMAIL || 'local@soundify.app',
    password: process.env.LOCAL_USER_PASSWORD || 'soundify',
    name: process.env.LOCAL_USER_NAME || 'Local User',
  },
  upload: {
    maxFileSizeMb: parseInt(process.env.MAX_UPLOAD_MB || '100', 10),
    allowedAudioExt: ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac'] as const,
  },
};
