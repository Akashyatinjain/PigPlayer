import { prisma } from '../config/database';
import { mapSongForApi } from '../utils/song-mapper';
import { AppError } from '../middleware/error.middleware';

function mapPlaylist<T extends { songs?: Array<{ song: Parameters<typeof mapSongForApi>[0] } & Record<string, unknown>> }>(
  playlist: T
) {
  if (!playlist.songs) return playlist;
  return {
    ...playlist,
    songs: playlist.songs.map((ps) => ({
      ...ps,
      song: mapSongForApi(ps.song),
    })),
  };
}

export class PlaylistRepository {
  static async findByUser(userId?: string) {
    const playlists = await prisma.playlist.findMany({
      where: userId ? { OR: [{ userId }, { userId: null }] } : { userId: null },
      include: {
        songs: {
          include: { song: true },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return playlists.map(mapPlaylist);
  }

  static async searchPlaylists(query: string, userId?: string, limit: number = 20) {
    const userFilter = userId ? { OR: [{ userId }, { userId: null }] } : { userId: null };
    const playlists = await prisma.playlist.findMany({
      where: {
        AND: [
          userFilter,
          {
            name: {
              contains: query,
            },
          },
        ],
      },
      include: {
        songs: {
          include: { song: true },
          orderBy: { position: 'asc' },
        },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
    return playlists.map(mapPlaylist);
  }

  static async findById(id: string) {
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        songs: {
          include: { song: true },
          orderBy: { position: 'asc' },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    });
    return playlist ? mapPlaylist(playlist) : null;
  }

  static async create(data: {
    name: string;
    description?: string | null;
    coverUrl?: string | null;
    userId?: string | null;
  }) {
    return prisma.playlist.create({ data });
  }

  static async update(
    id: string,
    data: { name?: string; description?: string | null; coverUrl?: string | null }
  ) {
    return prisma.playlist.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.playlist.delete({ where: { id } });
  }

  static async addSong(playlistId: string, songId: string) {
    const item = await prisma.$transaction(async (tx) => {
      const lastItem = await tx.playlistSong.findFirst({
        where: { playlistId },
        select: { position: true },
        orderBy: { position: 'desc' },
      });
      return tx.playlistSong.create({
        data: { playlistId, songId, position: (lastItem?.position ?? -1) + 1 },
        include: { song: true },
      });
    });
    return { ...item, song: mapSongForApi(item.song) };
  }

  static async removeSong(playlistId: string, songId: string) {
    return prisma.playlistSong.deleteMany({
      where: { playlistId, songId },
    });
  }

  static async reorderSongs(playlistId: string, songIds: string[]) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.playlistSong.findMany({ where: { playlistId }, select: { songId: true } });
      const membership = new Set(current.map((entry) => entry.songId));
      if (songIds.length !== membership.size || new Set(songIds).size !== songIds.length ||
          songIds.some((id) => !membership.has(id))) {
        throw new AppError('Provide each song in the playlist exactly once.', 400);
      }
      for (const [position, songId] of songIds.entries()) {
        await tx.playlistSong.update({
          where: { playlistId_songId: { playlistId, songId } },
          data: { position },
        });
      }
    });
  }
}
