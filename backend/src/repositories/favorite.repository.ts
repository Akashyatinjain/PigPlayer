import { prisma } from '../config/database';
import { mapSongForApi } from '../utils/song-mapper';
import { getDefaultLocalUserId } from '../services/bootstrap.service';

export class FavoriteRepository {
  static async resolveUserId(userId?: string): Promise<string> {
    return userId || (await getDefaultLocalUserId());
  }

  static async findByUser(userId?: string) {
    const uid = await this.resolveUserId(userId);
    const favorites = await prisma.favorite.findMany({
      where: { userId: uid },
      include: { song: true },
      orderBy: { createdAt: 'desc' },
    });
    return favorites.map((f) => ({
      ...f,
      song: mapSongForApi(f.song),
    }));
  }

  static async addFavorite(songId: string, userId?: string) {
    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song) {
      const { AppError } = await import('../middleware/error.middleware');
      throw new AppError('Song not found', 404);
    }
    const uid = await this.resolveUserId(userId);
    const fav = await prisma.favorite.upsert({
      where: {
        userId_songId: { userId: uid, songId },
      },
      create: { userId: uid, songId },
      update: {},
      include: { song: true },
    });
    return { ...fav, song: mapSongForApi(fav.song) };
  }

  static async removeFavorite(songId: string, userId?: string) {
    const uid = await this.resolveUserId(userId);
    return prisma.favorite.deleteMany({
      where: { userId: uid, songId },
    });
  }

  static async isFavorite(songId: string, userId?: string) {
    const uid = await this.resolveUserId(userId);
    const fav = await prisma.favorite.findFirst({
      where: { songId, userId: uid },
    });
    return Boolean(fav);
  }
}
