export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number; // in seconds
  audioUrl: string;
  coverUrl: string | null;
  isDownloadable?: boolean;
  isAuthorizedDownload?: boolean; // legacy alias
  fileSize?: number | null;
  fileName?: string | null;
  mimeType?: string | null;
  format?: string | null; // legacy alias
  genre?: string | null;
  releaseYear?: number | null;
  year?: number | null; // legacy alias
  trackNumber?: number | null;
  bitrate?: number | null;
  fileHash?: string | null;
  userId?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  isFavorite?: boolean;
}

export interface PlaylistSongItem {
  id: string;
  playlistId: string;
  songId: string;
  position?: number;
  order?: number; // legacy alias
  addedAt: string | Date;
  song: Song;
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  userId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  songs?: PlaylistSongItem[];
  _count?: {
    songs: number;
  };
}

export interface PlayHistoryItem {
  id: string;
  songId: string;
  playedAt: string | Date;
  song: Song;
}

export type RepeatMode = "off" | "all" | "one";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role?: string;
}
