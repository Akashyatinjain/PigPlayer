import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { config } from '../config/env';
import { ensureStorageDirectories } from '../config/paths';
import { AppError } from '../middleware/error.middleware';

export async function bootstrapLocalApp(): Promise<void> {
  ensureStorageDirectories();
  if (config.databaseProvider === 'sqlite') await prisma.$queryRaw`PRAGMA journal_mode = WAL`;
  await prisma.$queryRaw`SELECT 1 FROM "AuthSession" LIMIT 1`;
  await prisma.$queryRaw`SELECT 1 FROM "Song" LIMIT 1`;

  if (config.localUser.provision) {
    const { email, name, password } = config.localUser;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, name, password: await bcrypt.hash(password, 10), role: 'admin' },
      });
    } else if (config.env === 'production' && existing.role === 'admin' &&
        await bcrypt.compare('soundify', existing.password)) {
      const replacement = await bcrypt.hash(password, 10);
      await prisma.$transaction(async (tx) => {
        const changed = await tx.user.updateMany({
          where: { id: existing.id, role: 'admin', password: existing.password },
          data: { password: replacement },
        });
        if (changed.count) await tx.authSession.deleteMany({ where: { userId: existing.id } });
      });
    }
  }

  if (config.allowGuestMutations) {
    await prisma.user.upsert({
      where: { email: config.guestEmail },
      update: {},
      create: { email: config.guestEmail, name: 'Local Guest', password: 'disabled' },
    });
  }

  if (config.env === 'development') {
    for (const email of ['demo@piggyplayer.app', 'demo@soundify.app']) {
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (!existing) {
        await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name: 'Demo Listener', password: await bcrypt.hash('password123', 10) },
        });
      }
    }
  }
}

export async function getDefaultLocalUserId(): Promise<string> {
  if (config.env === 'production' || !config.allowGuestMutations) {
    throw new AppError('Authentication required.', 401);
  }
  const user = await prisma.user.findUnique({
    where: { email: config.guestEmail },
    select: { id: true },
  });
  if (!user) throw new AppError('Local guest account is unavailable.', 503);
  return user.id;
}
