import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { config } from '../config/env';
import { ensureStorageDirectories } from '../config/paths';
import { logger } from '../utils/logger';

/**
 * First-run bootstrap: directories, default local user.
 */
export async function bootstrapLocalApp(): Promise<void> {
  ensureStorageDirectories();
  logger.info('Storage directories verified');

  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
  } catch (err) {
    logger.warn(`Could not set SQLite pragmas: ${String(err)}`);
  }

  const email = config.localUser.email;
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const hashed = await bcrypt.hash(config.localUser.password, 10);
    await prisma.user.create({
      data: {
        email,
        name: config.localUser.name,
        password: hashed,
        role: config.env === 'production' ? 'admin' : 'user',
      },
    });
    logger.info(`Default local user created: ${email}`);
  } else {
    if (config.env === 'production' && existing.role !== 'admin') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'admin' } });
    }
    logger.info(`Default local user ready: ${email}`);
  }
}

export async function getDefaultLocalUserId(): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email: config.localUser.email },
  });
  if (!user) {
    await bootstrapLocalApp();
    const created = await prisma.user.findUnique({
      where: { email: config.localUser.email },
    });
    if (!created) throw new Error('Failed to create default local user');
    return created.id;
  }
  return user.id;
}
