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

  const email = config.localUser.email;
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const hashed = await bcrypt.hash(config.localUser.password, 10);
    await prisma.user.create({
      data: {
        email,
        name: config.localUser.name,
        password: hashed,
        role: 'user',
      },
    });
    logger.info(`Default local user created: ${email}`);
  } else {
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
