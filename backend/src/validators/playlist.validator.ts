import { z } from 'zod';

export const createPlaylistSchema = z.object({
  name: z.string().min(1, 'Playlist name is required'),
  description: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
});

export const updatePlaylistSchema = createPlaylistSchema.partial();

export const addSongToPlaylistSchema = z.object({
  songId: z.string().min(1, 'Song ID is required'),
});

export const reorderPlaylistSchema = z.object({
  songIds: z.array(z.string()).min(1, 'Array of song IDs required'),
});
