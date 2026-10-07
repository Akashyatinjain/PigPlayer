import api from '@/lib/api';
import { PlayHistoryItem } from '@/types/music';
import { normalizeSong } from './song.service';

export const historyService = {
  async getHistory(): Promise<PlayHistoryItem[]> {
    const res = await api.get('/history');
    const list = res.data.data || [];
    return list.map((item: any) => ({
      id: item.id || `${item.songId}-${item.playedAt}`,
      songId: item.songId || item.id,
      playedAt: item.playedAt,
      song: normalizeSong(item),
    }));
  },

  async recordPlay(songId: string): Promise<boolean> {
    try {
      const res = await api.post('/history', { songId });
      return res.data.success;
    } catch {
      return false;
    }
  },

  async clearHistory(): Promise<boolean> {
    const res = await api.delete('/history');
    return res.data.success;
  },
};
