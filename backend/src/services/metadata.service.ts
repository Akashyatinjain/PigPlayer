import { parseBuffer } from 'music-metadata';
import path from 'path';

export interface ExtractedMetadata {
  title: string;
  artist: string;
  album: string | null;
  albumArtist: string | null;
  genre: string | null;
  trackNumber: number | null;
  discNumber: number | null;
  releaseYear: number | null;
  composer: string | null;
  duration: number;
  bitrate: number | null;
  mimeType: string;
  picture?: {
    data: Buffer;
    format: string;
  } | null;
}

/**
 * Parse missing fields from common filename patterns:
 * 01 - Song Name.mp3
 * Artist - Song Name.mp3
 * 01 Artist - Song Name.mp3
 */
export function parseFilenameFallback(filename: string): {
  title?: string;
  artist?: string;
  trackNumber?: number;
} {
  const base = path.basename(filename, path.extname(filename)).trim();
  if (!base) return {};

  // 01 - Title  OR  01. Title
  let match = base.match(/^(\d{1,3})\s*[-.]\s*(.+)$/);
  if (match) {
    return { trackNumber: parseInt(match[1], 10), title: match[2].trim() };
  }

  // Artist - Title
  match = base.match(/^(.+?)\s+-\s+(.+)$/);
  if (match) {
    const left = match[1].trim();
    const right = match[2].trim();
    // 01 Artist - Title
    const numbered = left.match(/^(\d{1,3})\s+(.+)$/);
    if (numbered) {
      return {
        trackNumber: parseInt(numbered[1], 10),
        artist: numbered[2].trim(),
        title: right,
      };
    }
    return { artist: left, title: right };
  }

  return { title: base };
}

export class MetadataService {
  static async extractFromBuffer(
    buffer: Buffer,
    filename: string,
    mimeHint?: string
  ): Promise<ExtractedMetadata> {
    const fallback = parseFilenameFallback(filename);

    let parsed;
    try {
      parsed = await parseBuffer(buffer, {
        mimeType: mimeHint,
        size: buffer.length,
      });
    } catch {
      return {
        title: fallback.title || path.basename(filename, path.extname(filename)) || 'Unknown Title',
        artist: fallback.artist || 'Unknown Artist',
        album: null,
        albumArtist: null,
        genre: null,
        trackNumber: fallback.trackNumber ?? null,
        discNumber: null,
        releaseYear: null,
        composer: null,
        duration: 0,
        bitrate: null,
        mimeType: mimeHint || 'audio/mpeg',
        picture: null,
      };
    }

    const common = parsed.common;
    const format = parsed.format;

    const picture =
      common.picture && common.picture.length > 0
        ? {
            data: Buffer.from(common.picture[0].data),
            format: common.picture[0].format || 'image/jpeg',
          }
        : null;

    const year =
      common.year ||
      (common.date ? parseInt(String(common.date).slice(0, 4), 10) : null) ||
      null;

    return {
      title: common.title?.trim() || fallback.title || 'Unknown Title',
      artist: common.artist?.trim() || fallback.artist || 'Unknown Artist',
      album: common.album?.trim() || null,
      albumArtist: common.albumartist?.trim() || null,
      genre: common.genre?.[0]?.trim() || null,
      trackNumber: common.track?.no ?? fallback.trackNumber ?? null,
      discNumber: common.disk?.no ?? null,
      releaseYear: Number.isFinite(year as number) ? (year as number) : null,
      composer: common.composer?.[0]?.trim() || null,
      duration: format.duration ? Math.round(format.duration * 100) / 100 : 0,
      bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : null,
      mimeType: format.container
        ? `audio/${format.container.toLowerCase()}`
        : mimeHint || 'audio/mpeg',
      picture,
    };
  }
}
