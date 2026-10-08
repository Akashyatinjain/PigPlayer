import api from '@/lib/api';
import { Song } from '@/types/music';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

/** Resolve relative backend paths to absolute localhost URLs */
export const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

/** @deprecated use resolveMediaUrl */
export const resolveAudioUrl = resolveMediaUrl;

export const normalizeSong = (song: Record<string, unknown>): Song => {
  const id = String(song.id || '');
  const audioUrl =
    resolveMediaUrl((song.audioUrl as string) || (id ? `/api/songs/${id}/audio` : ''));
  const coverRaw = song.coverUrl as string | null | undefined;
  const coverUrl = coverRaw
    ? resolveMediaUrl(coverRaw)
    : id
      ? resolveMediaUrl(`/api/songs/${id}/artwork`)
      : null;

  return {
    ...(song as unknown as Song),
    id,
    title: String(song.title || 'Unknown'),
    artist: String(song.artist || 'Unknown'),
    album: (song.album as string) || null,
    duration: Number(song.duration) || 0,
    audioUrl,
    coverUrl: coverRaw || song.coverRelativePath ? coverUrl : null,
    isAuthorizedDownload: (song.isDownloadable as boolean) ?? (song.isAuthorizedDownload as boolean) ?? true,
    isDownloadable: (song.isDownloadable as boolean) ?? true,
    year: (song.releaseYear as number) ?? (song.year as number) ?? null,
    releaseYear: (song.releaseYear as number) ?? null,
    format: (song.mimeType as string) ?? (song.format as string) ?? 'audio/mpeg',
  };
};

export const songService = {
  async getSongs(params?: { q?: string; genre?: string; page?: number; limit?: number }): Promise<Song[]> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const res = await api.get('/songs', {
      params: { ...params, page, limit },
    });
    const songs = res.data.data || [];
    const totalPages = params?.page
      ? page
      : Math.max(1, Number(res.data.pagination?.totalPages) || 1);

    if (totalPages > page) {
      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - page }, (_, index) =>
          api.get('/songs', {
            params: { ...params, page: page + index + 1, limit },
          })
        )
      );
      for (const pageResponse of remainingPages) {
        songs.push(...(pageResponse.data.data || []));
      }
    }

    return songs.map((s: Record<string, unknown>) => normalizeSong(s));
  },

  async getSong(id: string): Promise<Song> {
    const res = await api.get(`/songs/${id}`);
    return normalizeSong(res.data.data);
  },

  async getStats() {
    const res = await api.get('/songs/stats');
    return res.data.data;
  },

  async checkDuplicate(params: { fileHash?: string; title?: string; artist?: string }) {
    const res = await api.post('/songs/check-duplicate', params);
    return res.data.data;
  },

  async createSong(songData: Partial<Song>): Promise<Song> {
    const res = await api.post('/songs', songData);
    return normalizeSong(res.data.data);
  },

  async updateSong(id: string, songData: Partial<Song>): Promise<Song> {
    const res = await api.put(`/songs/${id}`, songData);
    return normalizeSong(res.data.data);
  },

  async deleteSong(id: string): Promise<boolean> {
    const res = await api.delete(`/songs/${id}`);
    return res.data.success;
  },

  async deleteAllSongs(): Promise<boolean> {
    const res = await api.delete('/songs/all');
    return res.data.success;
  },

  getDownloadUrl(id: string): string {
    return `${API_BASE}/songs/${id}/download`;
  },

  async downloadSong(id: string, fileName?: string): Promise<void> {
    const url = this.getDownloadUrl(id);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'track';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
