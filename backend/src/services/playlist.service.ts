import { PlaylistRepository } from '../repositories/playlist.repository';
import { AppError } from '../middleware/error.middleware';
import { config } from '../config/env';

export class PlaylistService {
  static async listPlaylists(userId?: string) {
    return PlaylistRepository.findByUser(userId);
  }

  static async getPlaylistById(id: string, userId?: string) {
    const playlist = await PlaylistRepository.findById(id);
    if (!playlist) {
      throw new AppError('Playlist not found', 404);
    }
    if (playlist.userId && playlist.userId !== userId) {
      throw new AppError('Forbidden: this playlist belongs to another user.', 403);
    }
    if (config.env === 'production' && playlist.userId !== userId) {
      throw new AppError('Forbidden: this playlist belongs to another user.', 403);
    }
    return playlist;
  }

  static async createPlaylist(data: {
    name: string;
    description?: string | null;
    coverUrl?: string | null;
    userId?: string | null;
  }) {
    return PlaylistRepository.create(data);
  }

  static async updatePlaylist(
    id: string,
    data: { name?: string; description?: string | null; coverUrl?: string | null },
    userId?: string
  ) {
    const playlist = await PlaylistRepository.findById(id);
    if (!playlist) {
      throw new AppError('Playlist not found', 404);
    }

    if (playlist.userId && playlist.userId !== userId) {
      throw new AppError('Forbidden: only playlist owners can modify playlists', 403);
    }
    if (config.env === 'production' && playlist.userId !== userId) {
      throw new AppError('Forbidden: only playlist owners can modify playlists', 403);
    }

    return PlaylistRepository.update(id, data);
  }

  static async deletePlaylist(id: string, userId?: string) {
    const playlist = await PlaylistRepository.findById(id);
    if (!playlist) {
      throw new AppError('Playlist not found', 404);
    }

    if (playlist.userId && playlist.userId !== userId) {
      throw new AppError('Forbidden: only playlist owners can delete playlists', 403);
    }
    if (config.env === 'production' && playlist.userId !== userId) {
      throw new AppError('Forbidden: only playlist owners can delete playlists', 403);
    }

    return PlaylistRepository.delete(id);
  }

  static async addSong(playlistId: string, songId: string, userId?: string) {
    const playlist = await PlaylistRepository.findById(playlistId);
    if (!playlist) {
      throw new AppError('Playlist not found', 404);
    }

    if (playlist.userId && playlist.userId !== userId) {
      throw new AppError('Forbidden: only playlist owners can add songs', 403);
    }
    if (config.env === 'production' && playlist.userId !== userId) {
      throw new AppError('Forbidden: only playlist owners can add songs', 403);
    }

    const { prisma } = await import('../config/database');
    const songExists = await prisma.song.findUnique({ where: { id: songId } });
    if (!songExists) {
      throw new AppError('Song not found', 404);
    }

    const alreadyExists = playlist.songs.some((ps) => ps.songId === songId);
    if (alreadyExists) {
      throw new AppError('Song is already in this playlist', 400);
    }

    return PlaylistRepository.addSong(playlistId, songId);
  }

  static async removeSong(playlistId: string, songId: string, userId?: string) {
    const playlist = await PlaylistRepository.findById(playlistId);
    if (!playlist) {
      throw new AppError('Playlist not found', 404);
    }

    if (playlist.userId && playlist.userId !== userId) {
      throw new AppError('Forbidden: only playlist owners can remove songs', 403);
    }
    if (config.env === 'production' && playlist.userId !== userId) {
      throw new AppError('Forbidden: only playlist owners can remove songs', 403);
    }

    return PlaylistRepository.removeSong(playlistId, songId);
  }

  static async reorderSongs(playlistId: string, songIds: string[], userId?: string) {
    const playlist = await PlaylistRepository.findById(playlistId);
    if (!playlist) {
      throw new AppError('Playlist not found', 404);
    }

    if (playlist.userId && playlist.userId !== userId) {
      throw new AppError('Forbidden: only playlist owners can reorder playlists', 403);
    }
    if (config.env === 'production' && playlist.userId !== userId) {
      throw new AppError('Forbidden: only playlist owners can reorder playlists', 403);
    }

    return PlaylistRepository.reorderSongs(playlistId, songIds);
  }
}
