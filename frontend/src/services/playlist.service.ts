import api from '@/lib/api';
import { Playlist } from '@/types/music';
import { normalizeSong, resolveAudioUrl } from './song.service';

type PlaylistPayload = Record<string, unknown> & {
  coverUrl?: string | null;
  songs?: Array<Record<string, unknown> & {
    id?: string;
    playlistId?: string;
    songId?: string;
    addedAt?: string | Date;
    position?: number;
    order?: number;
    song?: Record<string, unknown>;
  }>;
};

const normalizePlaylist = (pl: PlaylistPayload): Playlist => ({
  ...(pl as unknown as Playlist),
  coverUrl: pl.coverUrl ? resolveAudioUrl(pl.coverUrl) : null,
  songs: pl.songs?.map((item) => ({
    ...item,
    id: String(item.id ?? ""),
    playlistId: String(item.playlistId ?? pl.id ?? ""),
    songId: String(item.songId ?? item.song?.id ?? ""),
    addedAt: item.addedAt ?? new Date(0),
    order: item.position ?? item.order ?? 0,
    song: normalizeSong(item.song ?? {}),
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
