import { AppError } from '../middleware/error.middleware';
import { localStorageProvider } from './storage/local-storage.provider';

const maxArtworkBytes = 10 * 1024 ** 2;
const artworkMime: Record<string, string> = {
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
};

export class ArtworkService {
  static embeddedMime(picture?: { data: Buffer } | null) {
    if (!picture?.data.length || picture.data.length > maxArtworkBytes) return null;
    const { ext } = localStorageProvider.validateArtworkBuffer(picture.data);
    return artworkMime[ext] ?? null;
  }

  static async saveEmbedded(picture: { data: Buffer } | null | undefined) {
    if (!picture || !this.embeddedMime(picture)) return null;
    return localStorageProvider.saveArtwork(picture.data);
  }

  static async saveUpload(buffer: Buffer) {
    if (buffer.length > maxArtworkBytes) throw new AppError('Artwork must be 10 MB or smaller.', 413);
    if (!localStorageProvider.validateArtworkBuffer(buffer).ok) {
      throw new AppError('Unsupported artwork. Use JPEG, PNG, GIF, or WebP.', 400);
    }
    return localStorageProvider.saveArtwork(buffer);
  }
}
