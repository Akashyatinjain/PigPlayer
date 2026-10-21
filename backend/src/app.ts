import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, normalizeOrigin } from './config/env';
import { errorHandler, AppError } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import songRoutes from './routes/song.routes';
import searchRoutes from './routes/search.routes';
import playlistRoutes from './routes/playlist.routes';
import favoriteRoutes from './routes/favorite.routes';
import historyRoutes from './routes/history.routes';
import uploadRoutes from './routes/upload.routes';
import backupRoutes from './routes/backup.routes';

const app = express();

app.set('trust proxy', 1);

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
  .map((origin) => (origin === '*' ? '*' : normalizeOrigin(origin)))
  .filter(Boolean);

export const isAllowedOrigin = (origin: string): boolean => {
  if (!origin) return true;

  if (allowedOrigins.includes('*')) {
    return true;
  }

  const normalized = normalizeOrigin(origin);

  if (allowedOrigins.some((allowed) => allowed.toLowerCase() === normalized.toLowerCase())) {
    return true;
  }

  if (/^https:\/\/(pig-player|pigplayer)(-[a-z0-9_-]+)?\.vercel\.app$/i.test(normalized)) {
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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
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
app.options('*', cors(corsOptions));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.env === 'production' ? 2000 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.env === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Try again later.' },
});
app.use(
  ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/auth/login', '/auth/register', '/auth/refresh'],
  authLimiter
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

const apiRouter = express.Router();
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
app.use((req, _res, next) => {
  next(new AppError(`API endpoint not found: ${req.method} ${req.originalUrl}`, 404));
});

app.use(errorHandler);

export default app;
