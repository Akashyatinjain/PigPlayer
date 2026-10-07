import api from '@/lib/api';
import { Song } from '@/types/music';
import { normalizeSong } from './song.service';

export interface UploadProgressCallback {
  (percentage: number): void;
}

export const uploadService = {
  /**
   * Upload song audio file + optional cover image with onUploadProgress
   */
  async uploadSong(
    audioFile: File,
    metadata: {
      title: string;
      artist: string;
      album?: string;
      genre?: string;
      duration?: number;
      coverUrl?: string;
      fileName?: string;
      fileHash?: string;
      trackNumber?: number;
      releaseYear?: number;
      bitrate?: number;
      isDownloadable?: boolean;
    },
    coverFile?: File | Blob,
    onProgress?: UploadProgressCallback
  ): Promise<Song> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    if (coverFile) {
      formData.append('cover', coverFile);
    }

    formData.append('title', metadata.title);
    formData.append('artist', metadata.artist);
    if (metadata.album) formData.append('album', metadata.album);
    if (metadata.genre) formData.append('genre', metadata.genre);
    if (metadata.duration) formData.append('duration', String(metadata.duration));
    if (metadata.coverUrl) formData.append('coverUrl', metadata.coverUrl);
    if (metadata.fileName) formData.append('fileName', metadata.fileName);
    if (metadata.fileHash) formData.append('fileHash', metadata.fileHash);
    if (metadata.trackNumber) formData.append('trackNumber', String(metadata.trackNumber));
    if (metadata.releaseYear) formData.append('releaseYear', String(metadata.releaseYear));
    if (metadata.bitrate) formData.append('bitrate', String(metadata.bitrate));
    formData.append('isDownloadable', String(metadata.isDownloadable ?? true));

    const res = await api.post('/upload/song', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return normalizeSong(res.data.data);
  },

  /**
   * Upload artwork separately (e.g. ID3 embedded artwork)
   */
  async uploadArtwork(imageBlobOrFile: Blob | File): Promise<string> {
    const formData = new FormData();
    formData.append('cover', imageBlobOrFile, 'cover.jpg');

    const res = await api.post('/upload/artwork', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data.data.coverUrl;
  },
};
