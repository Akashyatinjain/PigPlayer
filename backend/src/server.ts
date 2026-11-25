import { once } from 'node:events';
import { logger } from './utils/logger';
import { config } from './config/env';
import { prisma } from './config/database';
import { bootstrapLocalApp } from './services/bootstrap.service';
import app from './app';

async function main() {
  try {
    await prisma.$connect();
    await bootstrapLocalApp();
    const server = app.listen(config.port, '0.0.0.0');
    await once(server, 'listening');
    logger.info(`PigPlayer API listening on port ${config.port}`);

    let stopping = false;
    const shutdown = () => {
      if (stopping) return;
      stopping = true;
      logger.info('Closing HTTP and database connections');
      const timeout = setTimeout(() => {
        logger.error('Graceful shutdown exceeded 10 seconds');
        server.closeAllConnections();
        process.exit(1);
      }, 10_000).unref();

      server.close((serverError) => {
        void prisma.$disconnect().then(() => {
          if (serverError) process.exitCode = 1;
        }).catch(() => {
          logger.error('Database disconnect failed');
          process.exitCode = 1;
        }).finally(() => clearTimeout(timeout));
      });
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}

void main().catch((error) => {
  const code = error?.errorCode ?? error?.code;
  const detail = typeof code === 'string' && /^(P\d{4}|EADDRINUSE|EACCES)$/.test(code)
    ? code
    : undefined;
  logger.error('API startup failed', process.env.NODE_ENV === 'production' ? detail : error);
  process.exitCode = 1;
});
