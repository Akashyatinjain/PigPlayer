import { containsText, prisma } from '../config/database';
import { config } from '../config/env';
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
      const contains = containsText(query);
      where.OR = [
        { title: contains },
        { artist: contains },
        { album: contains },
        { genre: contains },
      ];
    }

    if (genre && genre !== 'All') {
      where.genre = containsText(genre);
    }

    const skip = (page - 1) * limit;

    const [songs, total] = await prisma.$transaction([
      prisma.song.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.song.count({ where }),
    ], { isolationLevel: 'Serializable' });

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

  static async findByIdRaw(id: string) {
    return prisma.song.findUnique({ where: { id } });
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
      const exactMatch = await prisma.song.findFirst({ where: { fileHash }, orderBy: { id: 'asc' } });
      if (exactMatch) return { matchType: 'exact' as const, song: mapSongForApi(exactMatch) };
    }

    if (title && artist) {
      const [match] = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Song"
        WHERE lower("title") = lower(${title}) AND lower("artist") = lower(${artist})
        ORDER BY "id" LIMIT 1
      `;
      const metaMatch = match && await this.findByIdRaw(match.id);
      if (metaMatch) return { matchType: 'metadata' as const, song: mapSongForApi(metaMatch) };
    }

    return null;
  }

  static async getLibraryStats(userId?: string, includePrivate = false) {
    const visibility = includePrivate ? {} : userId ? { OR: [{ userId }, { userId: null }] } : { userId: null };
    const showPersonalStats = includePrivate || Boolean(userId) || config.allowGuestMutations;
    const favoriteFilter = includePrivate ? {} : { user: userId ? { id: userId } : { email: config.guestEmail } };
    const historyFilter = includePrivate ? {} : { userId: userId ?? null };
    const [[songs], totalPlaylists, favoriteSongs, listeningHistoryCount] = await Promise.all([
      prisma.$queryRaw<Array<Record<'totalSongs' | 'totalArtists' | 'totalAlbums' | 'storageUsed', bigint>>>`
        SELECT count(*) AS "totalSongs", count(DISTINCT lower("artist")) AS "totalArtists",
               count(DISTINCT nullif(lower("album"), '')) AS "totalAlbums",
               coalesce(sum("fileSize"), 0) AS "storageUsed"
        FROM "Song"
      `,
      prisma.playlist.count({ where: visibility }),
      showPersonalStats ? prisma.favorite.count({ where: favoriteFilter }) : 0,
      showPersonalStats ? prisma.playHistory.count({ where: historyFilter }) : 0,
    ]);
    return {
      totalSongs: Number(songs.totalSongs),
      totalArtists: Number(songs.totalArtists),
      totalAlbums: Number(songs.totalAlbums),
      storageUsed: Number(songs.storageUsed),
      totalPlaylists,
      favoriteSongs,
      listeningHistoryCount,
    };
  }
}
