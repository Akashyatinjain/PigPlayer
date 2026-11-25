import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, normalizeOrigin } from './config/env';
import { errorHandler, AppError } from './middleware/error.middleware';
import { prisma } from './config/database';

import authRoutes from './routes/auth.routes';
import songRoutes from './routes/song.routes';
import searchRoutes from './routes/search.routes';
import playlistRoutes from './routes/playlist.routes';
import favoriteRoutes from './routes/favorite.routes';
import historyRoutes from './routes/history.routes';
import uploadRoutes from './routes/upload.routes';
import backupRoutes from './routes/backup.routes';

const app = express();

app.set('trust proxy', config.trustProxyHops || false);
app.set('query parser', 'simple');

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const defaultAllowedOrigins = [
  'https://pig-player.vercel.app',
  'https://pigplayer.vercel.app',
];

const allowedOrigins = Array.from(
  new Set([
    config.clientUrl,
    ...config.allowedOrigins,
    ...defaultAllowedOrigins,
    ...(config.env === 'production' ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000']),
  ])
)
  .filter(Boolean);

export const isAllowedOrigin = (origin: string): boolean => {
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);

  if (allowedOrigins.some((allowed) => allowed.toLowerCase() === normalized.toLowerCase())) {
    return true;
  }

  if (config.env !== 'production' &&
      /^https:\/\/(pig-player|pigplayer)(-[a-z0-9_-]+)?\.vercel\.app$/i.test(normalized)) {
    return true;
  }

  if (config.env !== 'production') {
    try {
      const url = new URL(normalized);
      if (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Audio element requests, curl, server-to-server, and mobile web views often send no origin
    if (!origin || isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Range',
    'Accept',
    'Accept-Ranges',
    'Cache-Control',
    'If-Range',
    'If-None-Match',
    'Origin',
    'X-Requested-With',
  ],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'ETag'],
  maxAge: 86400,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Opt-in guest writes are still restricted to known browser origins.
app.use((req, _res, next) => {
  if (config.allowGuestMutations && req.headers.origin &&
      !['HEAD', 'GET', 'OPTIONS'].includes(req.method) && !isAllowedOrigin(req.headers.origin)) {
    return next(new AppError('Origin is not allowed.', 403));
  }
  next();
});

const rateLimitValidation = { xForwardedForHeader: config.trustProxyHops > 0 };

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.env === 'production' ? 2000 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: rateLimitValidation,
  message: { success: false, message: 'Too many requests. Try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.env === 'production' ? 30 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: rateLimitValidation,
  message: { success: false, message: 'Too many authentication attempts. Try again later.' },
});

// Ultra-fast Health / Keepalive endpoints for Render free-tier wakeups
const handleHealth = (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'ok',
    mode: 'offline-first',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', handleHealth);
app.get('/api/health', handleHealth);
app.get(['/ready', '/api/ready'], async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await prisma.$queryRaw`SELECT 1 FROM "AuthSession" LIMIT 1`;
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

const apiRouter = express.Router();
apiRouter.use(['/auth', '/songs', '/search', '/playlists', '/favorites', '/history', '/upload', '/backups', '/backup'], limiter);
apiRouter.use(['/auth/login', '/auth/register', '/auth/refresh'], authLimiter);
const jsonBody = express.json({ limit: '256kb', inflate: false });
apiRouter.use((req, res, next) => {
  if (req.method === 'POST' && /^\/(backups?\/import|upload\/artwork)\/?$/i.test(req.path)) return next();
  return jsonBody(req, res, next);
});
apiRouter.use(express.urlencoded({ extended: false, limit: '256kb', inflate: false }));
apiRouter.use('/auth', authRoutes);
apiRouter.use('/songs', songRoutes);
apiRouter.use('/search', searchRoutes);
apiRouter.use('/playlists', playlistRoutes);
apiRouter.use('/favorites', favoriteRoutes);
apiRouter.use('/history', historyRoutes);
apiRouter.use('/upload', uploadRoutes);
apiRouter.use('/backups', backupRoutes);
apiRouter.use('/backup', backupRoutes);

app.use('/api', apiRouter);
// Fallback compatibility alias for clients without /api prefix
app.use(apiRouter);

// 404 handler for unmatched routes
app.use((_req, _res, next) => {
  next(new AppError('API endpoint not found.', 404));
});

app.use(errorHandler);

export default app;
