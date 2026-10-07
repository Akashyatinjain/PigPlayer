import api from '@/lib/api';
import { Playlist } from '@/types/music';
import { normalizeSong, resolveAudioUrl } from './song.service';

const normalizePlaylist = (pl: any): Playlist => ({
  ...pl,
  coverUrl: pl.coverUrl ? resolveAudioUrl(pl.coverUrl) : null,
  songs: pl.songs?.map((item: any) => ({
    ...item,
    order: item.position ?? item.order ?? 0,
    song: normalizeSong(item.song),
  })) || [],
});

export const playlistService = {
  async getPlaylists(): Promise<Playlist[]> {
    const res = await api.get('/playlists');
    const list = res.data.data || [];
    return list.map(normalizePlaylist);
  },

  async getPlaylist(id: string): Promise<Playlist> {
    const res = await api.get(`/playlists/${id}`);
    return normalizePlaylist(res.data.data);
  },

  async createPlaylist(name: string, description?: string, coverUrl?: string): Promise<Playlist> {
    const res = await api.post('/playlists', { name, description, coverUrl });
    return normalizePlaylist(res.data.data);
  },

  async updatePlaylist(id: string, data: { name?: string; description?: string; coverUrl?: string }): Promise<Playlist> {
    const res = await api.put(`/playlists/${id}`, data);
    return normalizePlaylist(res.data.data);
  },

  async deletePlaylist(id: string): Promise<boolean> {
    const res = await api.delete(`/playlists/${id}`);
    return res.data.success;
  },

  async addSong(playlistId: string, songId: string): Promise<boolean> {
    const res = await api.post(`/playlists/${playlistId}/songs`, { songId });
    return res.data.success;
  },

  async removeSong(playlistId: string, songId: string): Promise<boolean> {
    const res = await api.delete(`/playlists/${playlistId}/songs/${songId}`);
    return res.data.success;
  },

  async reorderSongs(playlistId: string, songIds: string[]): Promise<boolean> {
    const res = await api.put(`/playlists/${playlistId}/reorder`, { songIds });
    return res.data.success;
  },
};
