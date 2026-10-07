import { localStorage, StoredFile } from './storage/local-storage.provider';

export interface UploadResult {
  url: string;
  relativePath: string;
  fileName: string;
  size: number;
  format?: string;
}

/**
 * Storage facade — currently LocalStorageProvider only (offline-first).
 * Kept as a thin abstraction so a future cloud provider can be plugged in.
 */
export class StorageService {
  static async uploadAudio(
    fileBuffer: Buffer,
    filename: string,
    _mimeType: string
  ): Promise<UploadResult> {
    const stored: StoredFile = await localStorage.uploadAudio(fileBuffer, filename);
    return {
      url: stored.relativePath,
      relativePath: stored.relativePath,
      fileName: stored.fileName,
      size: stored.size,
      format: stored.fileName.split('.').pop(),
    };
  }

  static async uploadArtwork(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string = 'image/jpeg'
  ): Promise<UploadResult> {
    const { ArtworkService } = await import('./artwork.service');
    const stored = await ArtworkService.saveUpload(fileBuffer, filename, mimeType);
    return {
      url: stored.relativePath,
      relativePath: stored.relativePath,
      fileName: stored.fileName,
      size: fileBuffer.length,
    };
  }

  static async deleteAudio(relativePath: string): Promise<boolean> {
    if (!relativePath) return true;
    // Ignore legacy remote URLs
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return true;
    }
    const path = relativePath.startsWith('/uploads/')
      ? relativePath.replace(/^\/uploads\//, '')
      : relativePath;
    return localStorage.deleteAudio(path);
  }

  static async deleteArtwork(relativePath: string): Promise<boolean> {
    if (!relativePath) return true;
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return true;
    }
    const path = relativePath.startsWith('/uploads/')
      ? relativePath.replace(/^\/uploads\//, '')
      : relativePath;
    return localStorage.deleteArtwork(path);
  }

  static getAudioAbsolutePath(relativePath: string): string {
    return localStorage.getAudioPath(relativePath);
  }

  static getArtworkAbsolutePath(relativePath: string): string {
    return localStorage.getArtworkPath(relativePath);
  }

  static exists(relativePath: string): boolean {
    return localStorage.exists(relativePath);
  }

  static async hashBuffer(buffer: Buffer): Promise<string> {
    return localStorage.hashBuffer(buffer);
  }
}
