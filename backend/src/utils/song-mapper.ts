import { Song } from '@prisma/client';

/**
 * Enrich song records with API stream URLs for the frontend.
 * Never expose absolute filesystem paths.
 */
export function mapSongForApi<T extends Song>(song: T) {
  return {
    ...song,
    audioUrl: `/api/songs/${song.id}/audio`,
    coverUrl: song.coverRelativePath
      ? `/api/songs/${song.id}/artwork`
      : song.coverUrl && !song.coverUrl.startsWith('http')
        ? `/api/songs/${song.id}/artwork`
        : song.coverUrl || null,
    fileName: song.originalFileName || song.audioFileName || null,
  };
}

export function mapSongsForApi<T extends Song>(songs: T[]) {
  return songs.map(mapSongForApi);
}
