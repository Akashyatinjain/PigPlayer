import { once } from 'node:events';
import { migrateDatabase } from '../scripts/migrate';
import { logger } from './utils/logger';
import { config } from './config/env';
import { prisma } from './config/database';
import { bootstrapLocalApp } from './services/bootstrap.service';

async function main() {
  let startupStep = 'database migration';
  try {
    logger.info(`Running ${config.databaseProvider} migrations`);
    migrateDatabase();
    startupStep = 'database connection';
    logger.info(`Connecting to ${config.databaseProvider}`);
    await prisma.$connect();
    startupStep = 'application bootstrap';
    logger.info('Initializing storage and application data');
    await bootstrapLocalApp();
    startupStep = 'HTTP application setup';
    const { default: app } = require('./app') as typeof import('./app');
    startupStep = `HTTP listener on port ${config.port}`;
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
    process.exitCode = 1;
    const failure = (error ?? {}) as {
      code?: unknown;
      errorCode?: unknown;
      exitStatus?: unknown;
      signal?: unknown;
    };
    const code = failure.errorCode ?? failure.code;
    const safeCode = typeof code === 'string' &&
      /^(P\d{4}|PRISMA_CLI_EXIT|ERR_SQLITE_ERROR|EACCES|EPERM|EADDRINUSE|EADDRNOTAVAIL|ENOENT|ENOTDIR|EISDIR|ENOSPC|EROFS|EAGAIN|ETIMEDOUT|ECONNREFUSED)$/.test(code);
    const detail = safeCode ? { code } : undefined;
    const cliDetail = code === 'PRISMA_CLI_EXIT'
      ? {
          code,
          exitStatus: typeof failure.exitStatus === 'number' ? failure.exitStatus : undefined,
          signal: typeof failure.signal === 'string' && /^SIG[A-Z0-9]+$/.test(failure.signal) ? failure.signal : undefined,
        }
      : detail;
    logger.error(`API startup failed during ${startupStep}`, config.env === 'production' ? cliDetail : error);
    try {
      await prisma.$disconnect();
    } catch {
      logger.error('Database disconnect after startup failure failed');
    }
  }
}

void main();
