import { Song } from "@/types/music";

export interface OfflineTrackRecord {
  id: string;
  song: Song;
  audioBlob: Blob;
  coverBlob?: Blob | null;
  downloadedAt: number;
  sizeBytes: number;
}

const DB_NAME = "soundify_offline_vault";
const DB_VERSION = 1;
const STORE_NAME = "offline_tracks";

// Cache blob URLs in memory to avoid redundant object URLs and memory leaks
const objectUrlCache = new Map<string, string>();

class OfflineStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (typeof window === "undefined" || !window.indexedDB) {
      throw new Error("IndexedDB is not supported in this environment");
    }

    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Save a song (audio + optional cover) into IndexedDB
   */
  async saveSongOffline(song: Song): Promise<boolean> {
    try {
      const db = await this.getDB();

      // 1. Fetch audio stream
      let audioBlob: Blob | null = null;
      const audioSources = [
        song.audioUrl,
        song.id ? `/api/songs/${song.id}/audio` : null,
        song.id ? `/api/songs/${song.id}/download` : null,
      ].filter(Boolean) as string[];

      for (const src of audioSources) {
        try {
          const res = await fetch(src);
          if (res.ok) {
            audioBlob = await res.blob();
            if (audioBlob && audioBlob.size > 1000) {
              break;
            }
          }
        } catch {
          // Try next fallback
        }
      }

      if (!audioBlob || audioBlob.size === 0) {
        throw new Error(`Failed to download audio for song "${song.title}"`);
      }

      // 2. Fetch cover image if available
      let coverBlob: Blob | null = null;
      if (song.coverUrl && !song.coverUrl.startsWith("blob:")) {
        try {
          const coverRes = await fetch(song.coverUrl);
          if (coverRes.ok) {
            coverBlob = await coverRes.blob();
          }
        } catch {
          // Cover is optional, proceed without it
        }
      }

      const totalSize = audioBlob.size + (coverBlob?.size || 0);

      const record: OfflineTrackRecord = {
        id: song.id,
        song: {
          ...song,
          isOfflineAvailable: true,
          fileSize: audioBlob.size,
        },
        audioBlob,
        coverBlob,
        downloadedAt: Date.now(),
        sizeBytes: totalSize,
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      this.notifyOfflineChange();
      return true;
    } catch (err) {
      console.error("Failed to save song offline:", err);
      throw err;
    }
  }

  /**
   * Remove a song from IndexedDB
   */
  async removeSongOffline(songId: string): Promise<boolean> {
    try {
      const db = await this.getDB();

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(songId);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      // Revoke cached blob URL if any
      const cachedUrl = objectUrlCache.get(songId);
      if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl);
        objectUrlCache.delete(songId);
      }

      this.notifyOfflineChange();
      return true;
    } catch (err) {
      console.error("Failed to remove song from offline storage:", err);
      return false;
    }
  }

  /**
   * Check if a specific song is saved offline
   */
  async isSongOffline(songId: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise<boolean>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(songId);

        req.onsuccess = () => {
          resolve(!!req.result);
        };
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Get all offline song IDs
   */
  async getOfflineSongIds(): Promise<string[]> {
    try {
      const db = await this.getDB();
      return new Promise<string[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAllKeys();

        req.onsuccess = () => {
          resolve(req.result.map(String));
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  /**
   * Get playable blob URL for an offline song
   */
  async getOfflineAudioUrl(songId: string): Promise<string | null> {
    try {
      if (objectUrlCache.has(songId)) {
        return objectUrlCache.get(songId)!;
      }

      const db = await this.getDB();
      return new Promise<string | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(songId);

        req.onsuccess = () => {
          const record = req.result as OfflineTrackRecord | undefined;
          if (record?.audioBlob) {
            const blobUrl = URL.createObjectURL(record.audioBlob);
            objectUrlCache.set(songId, blobUrl);
            resolve(blobUrl);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Get all offline songs formatted with playable blob URLs
   */
  async getAllOfflineSongs(): Promise<Song[]> {
    try {
      const db = await this.getDB();
      return new Promise<Song[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const records = (req.result || []) as OfflineTrackRecord[];
          const songs: Song[] = records.map((rec) => {
            let audioUrl = objectUrlCache.get(rec.id);
            if (!audioUrl && rec.audioBlob) {
              audioUrl = URL.createObjectURL(rec.audioBlob);
              objectUrlCache.set(rec.id, audioUrl);
            }

            let coverUrl = rec.song.coverUrl;
            if (rec.coverBlob) {
              coverUrl = URL.createObjectURL(rec.coverBlob);
            }

            return {
              ...rec.song,
              audioUrl: audioUrl || rec.song.audioUrl,
              coverUrl,
              isOfflineAvailable: true,
            };
          });

          resolve(songs);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  /**
   * Import local audio file directly from device (phone/desktop file picker)
   */
  async importLocalFile(file: File): Promise<Song> {
    const db = await this.getDB();
    const id = `local-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Parse title & artist from file name
    const rawName = file.name.replace(/\.[^/.]+$/, "");
    let title = rawName;
    let artist = "Local Device";
    if (rawName.includes(" - ")) {
      const parts = rawName.split(" - ");
      artist = parts[0].trim();
      title = parts.slice(1).join(" - ").trim();
    }

    const blobUrl = URL.createObjectURL(file);
    objectUrlCache.set(id, blobUrl);

    const song: Song = {
      id,
      title,
      artist,
      album: "Device Storage",
      duration: 0,
      audioUrl: blobUrl,
      coverUrl: null,
      fileSize: file.size,
      mimeType: file.type || "audio/mpeg",
      isOfflineAvailable: true,
      isDownloadable: true,
      isAuthorizedDownload: true,
      createdAt: new Date(),
    };

    const record: OfflineTrackRecord = {
      id,
      song,
      audioBlob: file,
      downloadedAt: Date.now(),
      sizeBytes: file.size,
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    this.notifyOfflineChange();
    return song;
  }

  /**
   * Calculate storage used by offline tracks
   */
  async getStorageInfo(): Promise<{ usedBytes: number; quotaBytes: number; count: number }> {
    try {
      const songs = await this.getOfflineSongIds();
      let quotaBytes = 0;
      let usedBytes = 0;

      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        quotaBytes = estimate.quota || 0;
        usedBytes = estimate.usage || 0;
      }

      return {
        usedBytes,
        quotaBytes,
        count: songs.length,
      };
    } catch {
      return { usedBytes: 0, quotaBytes: 0, count: 0 };
    }
  }

  /**
   * Clear all offline songs
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      objectUrlCache.forEach((url) => URL.revokeObjectURL(url));
      objectUrlCache.clear();
      this.notifyOfflineChange();
    } catch (err) {
      console.error("Failed to clear offline storage:", err);
    }
  }

  private notifyOfflineChange() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("soundify:offline-change"));
    }
  }
}

export const offlineStorageService = new OfflineStorageService();
