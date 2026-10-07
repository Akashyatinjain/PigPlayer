import api from '@/lib/api';
import { normalizeSong } from './song.service';
import { Playlist, Song } from '@/types/music';

export const searchService = {
  async search(q: string): Promise<{ songs: Song[]; playlists: Playlist[] }> {
    if (!q.trim()) return { songs: [], playlists: [] };
    const res = await api.get('/search', { params: { q } });
    return {
      songs: (res.data.data?.songs || []).map((s: Record<string, unknown>) => normalizeSong(s)),
      playlists: res.data.data?.playlists || [],
    };
  },
};
