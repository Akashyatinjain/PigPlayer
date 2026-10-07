import { prisma } from '../config/database';
import { mapSongForApi } from '../utils/song-mapper';

export class HistoryRepository {
  static async findByUser(userId?: string, limit: number = 30) {
    const items = await prisma.playHistory.findMany({
      where: userId ? { userId } : {},
      include: { song: true },
      orderBy: { playedAt: 'desc' },
      take: limit,
    });
    return items.map((h) => ({
      ...h,
      song: mapSongForApi(h.song),
    }));
  }

  static async recordPlay(
    songId: string,
    userId?: string,
    durationPlayed?: number
  ) {
    const item = await prisma.playHistory.create({
      data: {
        songId,
        userId: userId || null,
        durationPlayed: durationPlayed != null ? Number(durationPlayed) : null,
      },
      include: { song: true },
    });
    return { ...item, song: mapSongForApi(item.song) };
  }

  static async clearHistory(userId?: string) {
    return prisma.playHistory.deleteMany({
      where: userId ? { userId } : {},
    });
  }
}
