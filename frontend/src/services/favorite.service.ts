import api from '@/lib/api';
import { Song } from '@/types/music';
import { normalizeSong } from './song.service';

export const favoriteService = {
  async getFavorites(): Promise<Song[]> {
    const res = await api.get('/favorites');
    const list = res.data.data || [];
    return list.map((song: Record<string, unknown>) => ({ ...normalizeSong(song), isFavorite: true }));
  },

  async addFavorite(songId: string): Promise<boolean> {
    const res = await api.post(`/favorites/${songId}`);
    return res.data.success;
  },

  async removeFavorite(songId: string): Promise<boolean> {
    const res = await api.delete(`/favorites/${songId}`);
    return res.data.success;
  },
};
