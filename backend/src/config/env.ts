import { randomBytes } from 'node:crypto';
import { databaseUrl } from '../../scripts/database-config';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function getSecret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[name]?.trim();
  const placeholder = /replace|placeholder|^(soundify-local|pigplayer-production|change-this)-/i;
  if (value && value.length >= 32 && !placeholder.test(value)) return value;
  if (isProduction) throw new Error(`${name} must contain at least 32 characters of unique secret material`);
  return randomBytes(48).toString('base64url');
}

function readInteger(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

export function normalizeOrigin(raw: string): string {
  try {
    const url = new URL(raw.trim());
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin;
  } catch {
    // Only HTTP origins are valid for browser access.
  }
  return '';
}

const clientUrl = normalizeOrigin(process.env.CLIENT_URL || 'http://localhost:3000');
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(normalizeOrigin).filter(Boolean);
const jwtSecret = getSecret('JWT_SECRET');
const refreshSecret = getSecret('JWT_REFRESH_SECRET');
if (!clientUrl) throw new Error('CLIENT_URL must be an HTTP or HTTPS URL');
if (jwtSecret === refreshSecret) throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must differ');

const localUserEmail = process.env.LOCAL_USER_EMAIL?.trim().toLowerCase();
const localUserPassword = process.env.LOCAL_USER_PASSWORD;
const allowGuestMutations = !isProduction &&
  (process.env.ALLOW_GUEST_MUTATIONS === 'true' || process.env.ALLOW_GUEST_UPLOADS === 'true');
if (isProduction && (localUserEmail || localUserPassword)) {
  if (!localUserEmail || !localUserPassword || localUserPassword.length < 16 ||
      Buffer.byteLength(localUserPassword) > 72 ||
      /replace|placeholder/i.test(localUserPassword) ||
      /^demo@(piggyplayer|soundify)\.app$/.test(localUserEmail)) {
    throw new Error('Set a valid LOCAL_USER_EMAIL and a unique LOCAL_USER_PASSWORD of 16 to 72 bytes');
  }
}

export const config = {
  env: nodeEnv,
  port: readInteger('PORT', 5000, 1, 65535),
  trustProxyHops: readInteger('TRUST_PROXY_HOPS', 0, 0, 10),
  clientUrl,
  allowedOrigins,
  allowGuestMutations,
  databaseUrl,
  jwt: {
    secret: jwtSecret,
    refreshSecret,
    accessSeconds: 15 * 60,
    sessionSeconds: 7 * 24 * 60 * 60,
  },
  localUser: {
    email: localUserEmail || 'local@soundify.app',
    password: localUserPassword || randomBytes(24).toString('base64url'),
    name: process.env.LOCAL_USER_NAME || 'Local User',
    provision: Boolean(localUserEmail && localUserPassword),
  },
  guestEmail: 'guest@local.invalid',
  upload: {
    maxFileSizeMb: readInteger('MAX_UPLOAD_MB', 100, 1, 100),
    allowedAudioExt: ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac'] as const,
  },
};
