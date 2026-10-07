import { localStorage } from './storage/local-storage.provider';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export class ArtworkService {
  static async saveEmbedded(
    picture: { data: Buffer; format: string } | null | undefined
  ): Promise<{ relativePath: string; fileName: string } | null> {
    if (!picture?.data?.length) return null;

    const ext = MIME_TO_EXT[picture.format.toLowerCase()] || '.jpg';
    const stored = await localStorage.saveArtwork(picture.data, ext);
    return {
      relativePath: stored.relativePath,
      fileName: stored.fileName,
    };
  }

  static async saveUpload(
    buffer: Buffer,
    filename: string,
    mimeType?: string
  ): Promise<{ relativePath: string; fileName: string }> {
    const ext =
      MIME_TO_EXT[(mimeType || '').toLowerCase()] ||
      (filename.toLowerCase().endsWith('.png')
        ? '.png'
        : filename.toLowerCase().endsWith('.webp')
          ? '.webp'
          : '.jpg');

    const stored = await localStorage.saveArtwork(buffer, ext);
    return {
      relativePath: stored.relativePath,
      fileName: stored.fileName,
    };
  }
}
