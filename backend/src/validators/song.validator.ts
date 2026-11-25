import { z } from 'zod';

const title = z.string().trim().min(1).max(512);
const text = z.string().trim().max(512).nullish();
const filePath = z.string().trim().min(1).max(2048);
const numeric = (schema: z.ZodNumber) => z.union([
  schema,
  z.string().trim().regex(/^\d+(\.\d+)?$/).transform(Number).pipe(schema),
]);
const integer = numeric(z.number().int().nonnegative().max(2147483647)).nullish();
const downloadable = z.union([z.boolean(), z.enum(['true', 'false']).transform((value) => value === 'true')]);

const metadataShape = {
  title,
  artist: title,
  album: text,
  albumArtist: text,
  genre: text,
  duration: numeric(z.number().finite().nonnegative()).optional(),
  trackNumber: integer,
  discNumber: integer,
  releaseYear: integer,
  composer: text,
  bitrate: integer,
  isDownloadable: downloadable.optional(),
};

const songBaseSchema = z.object({
  ...metadataShape,
  audioRelativePath: filePath.optional(),
  audioUrl: filePath.optional(),
  coverRelativePath: filePath.nullish(),
  coverUrl: filePath.nullish(),
  audioFileName: text,
  coverFileName: text,
  originalFileName: text,
  fileName: text,
  fileSize: integer,
  mimeType: text,
  fileHash: z.string().trim().max(128).nullish(),
});

export const createSongSchema = songBaseSchema.refine(
  (data) => Boolean(data.audioRelativePath ||
    (data.audioUrl && !/^https?:\/\//i.test(data.audioUrl) && !data.audioUrl.startsWith('/api/'))),
  { message: 'A local audioRelativePath is required', path: ['audioRelativePath'] },
);

export const updateSongSchema = songBaseSchema.partial();

export const uploadSongSchema = z.object({
  ...metadataShape,
  duplicatePolicy: z.enum(['skip', 'replace', 'keep']).default('skip'),
}).partial({ title: true, artist: true });

export const checkDuplicateSchema = z.object({
  fileHash: z.string().trim().max(128).optional(),
  title: title.optional(),
  artist: title.optional(),
});

const query = z.string().trim().max(256);
export const searchQuerySchema = z.object({ q: query.optional() });
export const songListQuerySchema = z.object({
  q: query.optional(),
  genre: query.optional(),
  page: numeric(z.number().int().min(1).max(1_000_000)).default(1),
  limit: numeric(z.number().int().min(1).max(500)).default(50),
});
