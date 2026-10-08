import { ensureStorageDirectories, DB_PATH } from './config/paths';
import { logger } from './utils/logger';

// Ensure data dirs exist before Prisma / dotenv consumers run
ensureStorageDirectories();

async function main() {
  // Load the local SQLite URL only after the data directories exist.
  const { config } = await import('./config/env');
  const { prisma } = await import('./config/database');
  const { bootstrapLocalApp } = await import('./services/bootstrap.service');
  const app = (await import('./app')).default;

  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (err) {
    logger.error('Database connection failed', err);
    process.exit(1);
  }

  try {
    await bootstrapLocalApp();
  } catch (err) {
    logger.error('Bootstrap failed', err);
  }

  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(`Soundify backend started on port ${config.port} (0.0.0.0)`);
    logger.info(`Client URL: ${config.clientUrl}`);
    logger.info('Offline-first mode: mobile LAN and offline ready');
  });

  const shutdown = async () => {
    logger.info('Gracefully shutting down...');
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Connections closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
