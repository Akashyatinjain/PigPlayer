import { prisma } from '../config/database';
import { mapSongForApi } from '../utils/song-mapper';

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
      where: userId ? { OR: [{ userId }, { userId: null }] } : {},
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
    const lastItem = await prisma.playlistSong.findFirst({
      where: { playlistId },
      orderBy: { position: 'desc' },
    });

    const position = lastItem ? lastItem.position + 1 : 0;

    const item = await prisma.playlistSong.create({
      data: { playlistId, songId, position },
      include: { song: true },
    });
    return { ...item, song: mapSongForApi(item.song) };
  }

  static async removeSong(playlistId: string, songId: string) {
    return prisma.playlistSong.deleteMany({
      where: { playlistId, songId },
    });
  }

  static async reorderSongs(playlistId: string, songIds: string[]) {
    return prisma.$transaction(
      songIds.map((songId, index) =>
        prisma.playlistSong.updateMany({
          where: { playlistId, songId },
          data: { position: index },
        })
      )
    );
  }
}
