import { Song } from "@/types/music";
import { resolveMediaUrl } from "./song.service";

export interface OfflineTrackRecord {
  id: string;
  song: Song;
  audioBlob: Blob;
  coverBlob?: Blob | null;
  downloadedAt: number;
  sizeBytes: number;
}

export interface CachedTrackRecord {
  id: string;
  song: Song;
  audioBlob: Blob;
  coverBlob?: Blob | null;
  cachedAt: number;
  sizeBytes: number;
}

const DB_NAME = "soundify_offline_vault";
const DB_VERSION = 2;
const STORE_NAME = "offline_tracks";
const CACHE_STORE_NAME = "playback_cache";
const MAX_CACHE_ITEMS = 40;

// Cache blob URLs in memory to avoid redundant object URLs and memory leaks
const objectUrlCache = new Map<string, string>();
const coverObjectUrlCache = new Map<string, { blob: Blob; url: string }>();
const activeFetchPromises = new Map<string, Promise<string | null>>();

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
        if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
          const cacheStore = db.createObjectStore(CACHE_STORE_NAME, { keyPath: "id" });
          cacheStore.createIndex("cachedAt", "cachedAt", { unique: false });
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
   * Helper to fetch audio blob from multiple candidate URLs
   */
  private async fetchAudioBlob(song: Song): Promise<Blob | null> {
    const rawAudioUrl = song.audioUrl || (song.id ? `/api/songs/${song.id}/audio` : "");
    const audioSources = [
      resolveMediaUrl(rawAudioUrl),
      song.id ? resolveMediaUrl(`/api/songs/${song.id}/audio`) : null,
      song.id ? resolveMediaUrl(`/api/songs/${song.id}/download`) : null,
      song.audioUrl,
    ].filter(Boolean) as string[];

    // Remove duplicates
    const uniqueSources = Array.from(new Set(audioSources));

    for (const src of uniqueSources) {
      try {
        const res = await fetch(src, {
          headers: { Accept: "audio/*, */*" },
          cache: "force-cache",
        });
        if (res.ok) {
          const blob = await res.blob();
          if (blob && blob.size > 1000) {
            return blob;
          }
        }
      } catch {
        // Try next candidate
      }
    }
    return null;
  }

  /**
   * Save a song explicitly (user clicked "Save Offline")
   */
  async saveSongOffline(song: Song): Promise<boolean> {
    try {
      const db = await this.getDB();

      // Check if already in cache or fetch blob
      let audioBlob: Blob | null = null;
      const cached = await this.getCachedRecord(song.id);
      if (cached?.audioBlob) {
        audioBlob = cached.audioBlob;
      } else {
        audioBlob = await this.fetchAudioBlob(song);
      }

      if (!audioBlob || audioBlob.size === 0) {
        throw new Error(`Failed to download audio for song "${song.title}"`);
      }

      // Fetch cover image if available
      let coverBlob: Blob | null = null;
      const resolvedCover = resolveMediaUrl(song.coverUrl);
      if (resolvedCover && !resolvedCover.startsWith("blob:")) {
        try {
          const coverRes = await fetch(resolvedCover);
          if (coverRes.ok) {
            coverBlob = await coverRes.blob();
          }
        } catch {
          // Cover is optional
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

      // Update objectUrlCache
      const existingUrl = objectUrlCache.get(song.id);
      if (existingUrl) {
        URL.revokeObjectURL(existingUrl);
      }
      const blobUrl = URL.createObjectURL(audioBlob);
      objectUrlCache.set(song.id, blobUrl);

      this.notifyOfflineChange();
      return true;
    } catch (err) {
      console.error("Failed to save song offline:", err);
      throw err;
    }
  }

  /**
   * Automatically cache a song into the resilient playback buffer in the background.
   * This guarantees that if the server closes or Render sleeps, playback never drops!
   */
  async cacheSongForPlayback(song: Song): Promise<string | null> {
    if (!song?.id) return null;

    // 1. If already in memory cache, return immediately
    if (objectUrlCache.has(song.id)) {
      return objectUrlCache.get(song.id)!;
    }

    // 2. If already fetching, wait for that fetch
    if (activeFetchPromises.has(song.id)) {
      return activeFetchPromises.get(song.id)!;
    }

    const fetchPromise = (async (): Promise<string | null> => {
      try {
        const db = await this.getDB();

        // 3. Check offline tracks store
        const offlineUrl = await this.getOfflineAudioUrl(song.id);
        if (offlineUrl) return offlineUrl;

        // 4. Check playback cache store
        const cached = await this.getCachedRecord(song.id);
        if (cached?.audioBlob) {
          const existingUrl = objectUrlCache.get(song.id);
          if (existingUrl) URL.revokeObjectURL(existingUrl);
          const blobUrl = URL.createObjectURL(cached.audioBlob);
          objectUrlCache.set(song.id, blobUrl);
          return blobUrl;
        }

        // 5. Fetch audio from backend in the background
        const audioBlob = await this.fetchAudioBlob(song);
        if (!audioBlob) return null;

        const existingUrl = objectUrlCache.get(song.id);
        if (existingUrl) URL.revokeObjectURL(existingUrl);
        const blobUrl = URL.createObjectURL(audioBlob);
        objectUrlCache.set(song.id, blobUrl);

        // Save into playback_cache
        const record: CachedTrackRecord = {
          id: song.id,
          song,
          audioBlob,
          cachedAt: Date.now(),
          sizeBytes: audioBlob.size,
        };

        const tx = db.transaction(CACHE_STORE_NAME, "readwrite");
        const store = tx.objectStore(CACHE_STORE_NAME);
        store.put(record);

        // Prune LRU if needed
        this.prunePlaybackCache(db).catch(() => {});

        return blobUrl;
      } catch (err) {
        console.warn(`[OfflineService] Background cache skipped for ${song.title}:`, err);
        return null;
      } finally {
        activeFetchPromises.delete(song.id);
      }
    })();

    activeFetchPromises.set(song.id, fetchPromise);
    return fetchPromise;
  }

  /**
   * Preload the next song in queue with low network priority
   */
  async preloadSong(song: Song): Promise<void> {
    if (!song?.id || objectUrlCache.has(song.id)) return;
    try {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        window.requestIdleCallback(() => {
          void this.cacheSongForPlayback(song);
        });
      } else {
        setTimeout(() => {
          void this.cacheSongForPlayback(song);
        }, 1500);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Helper to retrieve record from playback_cache
   */
  private async getCachedRecord(songId: string): Promise<CachedTrackRecord | null> {
    try {
      const db = await this.getDB();
      return new Promise<CachedTrackRecord | null>((resolve) => {
        const tx = db.transaction(CACHE_STORE_NAME, "readonly");
        const store = tx.objectStore(CACHE_STORE_NAME);
        const req = store.get(songId);
        req.onsuccess = () => resolve((req.result as CachedTrackRecord) || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Prune oldest records in playback_cache to stay under MAX_CACHE_ITEMS
   */
  private async prunePlaybackCache(db: IDBDatabase): Promise<void> {
    try {
      const tx = db.transaction(CACHE_STORE_NAME, "readwrite");
      const store = tx.objectStore(CACHE_STORE_NAME);
      const req = store.getAllKeys();

      req.onsuccess = () => {
        const keys = req.result;
        if (keys && keys.length > MAX_CACHE_ITEMS) {
          const deleteCount = keys.length - MAX_CACHE_ITEMS;
          for (let i = 0; i < deleteCount; i++) {
            const keyStr = String(keys[i]);
            store.delete(keys[i]);
            const cachedUrl = objectUrlCache.get(keyStr);
            if (cachedUrl) {
              URL.revokeObjectURL(cachedUrl);
              objectUrlCache.delete(keyStr);
            }
          }
        }
      };
    } catch {
      // ignore
    }
  }

  /**
   * Remove a song from explicit offline storage
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

      const cachedUrl = objectUrlCache.get(songId);
      if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl);
        objectUrlCache.delete(songId);
      }
      const cachedCover = coverObjectUrlCache.get(songId);
      if (cachedCover) {
        URL.revokeObjectURL(cachedCover.url);
        coverObjectUrlCache.delete(songId);
      }

      this.notifyOfflineChange();
      return true;
    } catch (err) {
      console.error("Failed to remove song from offline storage:", err);
      return false;
    }
  }

  /**
   * Check if a specific song is explicitly saved offline
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
   * Get playable blob URL for an offline or cached song.
   * Checks memory cache -> offline vault -> automatic playback cache.
   */
  async getOfflineAudioUrl(songId: string): Promise<string | null> {
    try {
      // 1. Fast path: in-memory blob URL
      if (objectUrlCache.has(songId)) {
        return objectUrlCache.get(songId)!;
      }

      const db = await this.getDB();

      // 2. Check offline vault
      const offlineBlob = await new Promise<Blob | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(songId);
        req.onsuccess = () => {
          const rec = req.result as OfflineTrackRecord | undefined;
          resolve(rec?.audioBlob || null);
        };
        req.onerror = () => resolve(null);
      });

      if (offlineBlob) {
        const blobUrl = URL.createObjectURL(offlineBlob);
        objectUrlCache.set(songId, blobUrl);
        return blobUrl;
      }

      // 3. Check playback cache
      const cachedRecord = await this.getCachedRecord(songId);
      if (cachedRecord?.audioBlob) {
        const blobUrl = URL.createObjectURL(cachedRecord.audioBlob);
        objectUrlCache.set(songId, blobUrl);
        return blobUrl;
      }

      return null;
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
              let cachedCover = coverObjectUrlCache.get(rec.id);
              if (!cachedCover || cachedCover.blob !== rec.coverBlob) {
                if (cachedCover) URL.revokeObjectURL(cachedCover.url);
                cachedCover = { blob: rec.coverBlob, url: URL.createObjectURL(rec.coverBlob) };
                coverObjectUrlCache.set(rec.id, cachedCover);
              }
              coverUrl = cachedCover.url;
            } else {
              const cachedCover = coverObjectUrlCache.get(rec.id);
              if (cachedCover) {
                URL.revokeObjectURL(cachedCover.url);
                coverObjectUrlCache.delete(rec.id);
              }
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
   * Calculate storage used by offline tracks and cache
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
   * Clear all offline songs and cached buffers
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_NAME, CACHE_STORE_NAME], "readwrite");
        tx.objectStore(STORE_NAME).clear();
        tx.objectStore(CACHE_STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      objectUrlCache.forEach((url) => URL.revokeObjectURL(url));
      objectUrlCache.clear();
      coverObjectUrlCache.forEach(({ url }) => URL.revokeObjectURL(url));
      coverObjectUrlCache.clear();
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
