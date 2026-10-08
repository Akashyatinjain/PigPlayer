import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { errorHandler } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import songRoutes from './routes/song.routes';
import searchRoutes from './routes/search.routes';
import playlistRoutes from './routes/playlist.routes';
import favoriteRoutes from './routes/favorite.routes';
import historyRoutes from './routes/history.routes';
import uploadRoutes from './routes/upload.routes';
import backupRoutes from './routes/backup.routes';

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = [
  config.clientUrl,
  ...config.allowedOrigins,
  ...(config.env === 'production' ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000']),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Audio element requests, curl, server-to-server, and mobile web views often send no origin
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (config.env === 'development') {
        try {
          const url = new URL(origin);
          if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
            return callback(null, true);
          }
        } catch {
          return callback(null, false);
        }
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
    ],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'ETag'],
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.env === 'production' ? 600 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.env === 'production' ? 20 : 100,
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

app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/backup', backupRoutes);

// Compatibility aliases if client calls without /api prefix
app.use('/auth', authRoutes);
app.use('/songs', songRoutes);
app.use('/search', searchRoutes);
app.use('/playlists', playlistRoutes);
app.use('/favorites', favoriteRoutes);
app.use('/history', historyRoutes);
app.use('/upload', uploadRoutes);
app.use('/backups', backupRoutes);
app.use('/backup', backupRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

export default app;
