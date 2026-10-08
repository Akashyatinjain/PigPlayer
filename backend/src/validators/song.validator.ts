import { z } from 'zod';

export const songBaseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  artist: z.string().min(1, 'Artist is required'),
  album: z.string().optional().nullable(),
  albumArtist: z.string().optional().nullable(),
  genre: z.string().optional().nullable(),
  duration: z.coerce.number().min(0).default(0),
  audioRelativePath: z.string().trim().min(1).optional(),
  audioUrl: z.string().trim().optional(),
  coverRelativePath: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  audioFileName: z.string().optional().nullable(),
  coverFileName: z.string().optional().nullable(),
  originalFileName: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileSize: z.coerce.number().optional().nullable(),
  mimeType: z.string().optional().nullable(),
  fileHash: z.string().optional().nullable(),
  trackNumber: z.coerce.number().optional().nullable(),
  discNumber: z.coerce.number().optional().nullable(),
  releaseYear: z.coerce.number().optional().nullable(),
  composer: z.string().optional().nullable(),
  bitrate: z.coerce.number().optional().nullable(),
  isDownloadable: z
    .union([
      z.boolean(),
      z.enum(['true', 'false']).transform((value) => value === 'true'),
    ])
    .default(true),
});

export const createSongSchema = songBaseSchema.refine(
  (d) => Boolean(
    d.audioRelativePath ||
      (d.audioUrl && !/^https?:\/\//i.test(d.audioUrl) && !d.audioUrl.startsWith('/api/'))
  ),
  {
    message: 'A local audioRelativePath is required',
    path: ['audioRelativePath'],
  }
);

export const updateSongSchema = songBaseSchema.partial();

export const checkDuplicateSchema = z.object({
  fileHash: z.string().optional(),
  title: z.string().optional(),
  artist: z.string().optional(),
});
