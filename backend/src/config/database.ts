import { PrismaClient } from '@prisma/client';
import { config } from './env';

// Both clients are generated from the same models.
const DatabaseClient: typeof PrismaClient = config.databaseProvider === 'postgresql'
  ? require('.prisma/postgresql-client').PrismaClient
  : PrismaClient;

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new DatabaseClient({
    datasources: { db: { url: config.databaseUrl } },
    log: process.env.NODE_ENV === 'development' ? ['warn'] : [],
  });

export function containsText(query: string) {
  return config.databaseProvider === 'postgresql'
    ? { contains: query, mode: 'insensitive' as const }
    : { contains: query };
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
