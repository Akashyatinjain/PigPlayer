import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { mapSongForApi, mapSongsForApi } from '../utils/song-mapper';

export class SongRepository {
  static async findMany({
    query,
    genre,
    page = 1,
    limit = 50,
  }: {
    query?: string;
    genre?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.SongWhereInput = {};

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { artist: { contains: query, mode: 'insensitive' } },
        { album: { contains: query, mode: 'insensitive' } },
        { genre: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (genre && genre !== 'All') {
      where.genre = { contains: genre, mode: 'insensitive' };
    }

    const skip = (page - 1) * limit;

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.song.count({ where }),
    ]);

    return {
      songs: mapSongsForApi(songs),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async findById(id: string) {
    const song = await prisma.song.findUnique({ where: { id } });
    return song ? mapSongForApi(song) : null;
  }

  static async findByIdRaw(id: string) {
    return prisma.song.findUnique({ where: { id } });
  }

  static async findByHash(fileHash: string) {
    if (!fileHash) return null;
    const song = await prisma.song.findFirst({ where: { fileHash } });
    return song ? mapSongForApi(song) : null;
  }

  static async findDuplicate({
    fileHash,
    title,
    artist,
  }: {
    fileHash?: string;
    title?: string;
    artist?: string;
  }) {
    if (fileHash) {
      const exactMatch = await prisma.song.findFirst({ where: { fileHash } });
      if (exactMatch) return { matchType: 'exact' as const, song: mapSongForApi(exactMatch) };
    }

    if (title && artist) {
      const all = await prisma.song.findMany({
        where: {
          title: { contains: title },
          artist: { contains: artist },
        },
        take: 20,
      });
      const metaMatch = all.find(
        (s) =>
          s.title.toLowerCase() === title.toLowerCase() &&
          s.artist.toLowerCase() === artist.toLowerCase()
      );
      if (metaMatch) return { matchType: 'metadata' as const, song: mapSongForApi(metaMatch) };
    }

    return null;
  }

  static async create(data: Prisma.SongCreateInput) {
    const song = await prisma.song.create({ data });
    // Backfill audioUrl/coverUrl stream paths
    const updated = await prisma.song.update({
      where: { id: song.id },
      data: {
        audioUrl: `/api/songs/${song.id}/audio`,
        coverUrl: song.coverRelativePath ? `/api/songs/${song.id}/artwork` : null,
      },
    });
    return mapSongForApi(updated);
  }

  static async update(id: string, data: Prisma.SongUpdateInput) {
    const song = await prisma.song.update({ where: { id }, data });
    return mapSongForApi(song);
  }

  static async delete(id: string) {
    return prisma.$transaction([
      prisma.playHistory.deleteMany({ where: { songId: id } }),
      prisma.favorite.deleteMany({ where: { songId: id } }),
      prisma.playlistSong.deleteMany({ where: { songId: id } }),
      prisma.song.delete({ where: { id } }),
    ]);
  }

  static async deleteAll() {
    return prisma.$transaction([
      prisma.playHistory.deleteMany({}),
      prisma.favorite.deleteMany({}),
      prisma.playlistSong.deleteMany({}),
      prisma.song.deleteMany({}),
    ]);
  }

  static async getLibraryStats() {
    const [totalSongs, totalPlaylists, totalFavorites, historyCount, songs] =
      await Promise.all([
        prisma.song.count(),
        prisma.playlist.count(),
        prisma.favorite.count(),
        prisma.playHistory.count(),
        prisma.song.findMany({
          select: { artist: true, album: true, fileSize: true },
        }),
      ]);

    const artists = new Set(songs.map((s) => s.artist.toLowerCase()));
    const albums = new Set(
      songs.map((s) => s.album?.toLowerCase()).filter(Boolean) as string[]
    );
    const storageUsed = songs.reduce((sum, s) => sum + (s.fileSize || 0), 0);

    return {
      totalSongs,
      totalArtists: artists.size,
      totalAlbums: albums.size,
      totalPlaylists,
      favoriteSongs: totalFavorites,
      listeningHistoryCount: historyCount,
      storageUsed,
    };
  }

  static async findAllForExport() {
    return prisma.song.findMany();
  }

  static async findAllRelativePaths() {
    return prisma.song.findMany({
      select: { audioRelativePath: true, coverRelativePath: true },
    });
  }
}
