"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Song, Playlist, PlayHistoryItem } from "@/types/music";
import { songService } from "@/services/song.service";
import { playlistService } from "@/services/playlist.service";
import { favoriteService } from "@/services/favorite.service";
import { historyService } from "@/services/history.service";
import { offlineStorageService } from "@/services/offline-storage.service";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { authService } from "@/services/auth.service";

export type LibraryTab = "home" | "songs" | "library" | "favorites" | "playlists" | "history" | "settings" | "offline";

interface LibraryContextType {
  songs: Song[];
  playlists: Playlist[];
  favorites: Song[];
  history: PlayHistoryItem[];
  offlineSongs: Song[];
  offlineSongIds: Set<string>;
  isOfflineSaving: Record<string, boolean>;
  isOnline: boolean;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeTab: LibraryTab;
  setActiveTab: (tab: LibraryTab) => void;
  selectedPlaylistId: string | null;
  setSelectedPlaylistId: (id: string | null) => void;
  
  // Modals
  isUploadOpen: boolean;
  setIsUploadOpen: (open: boolean) => void;
  isPlaylistModalOpen: boolean;
  setIsPlaylistModalOpen: (open: boolean) => void;
  isAddToPlaylistOpen: boolean;
  setIsAddToPlaylistOpen: (open: boolean) => void;
  songForPlaylist: Song | null;
  setSongForPlaylist: (song: Song | null) => void;
  isShortcutsOpen: boolean;
  setIsShortcutsOpen: (open: boolean) => void;

  // Actions
  refreshLibrary: () => Promise<void>;
  refreshOfflineSongs: () => Promise<void>;
  saveSongOffline: (song: Song) => Promise<boolean>;
  removeSongOffline: (songId: string) => Promise<boolean>;
  importLocalAudio: (file: File) => Promise<Song | null>;
  toggleFavorite: (songId: string) => Promise<boolean>;
  deleteSong: (songId: string) => Promise<boolean>;
  deleteAllSongs: () => Promise<boolean>;
  createPlaylist: (name: string, description?: string) => Promise<Playlist | null>;
  deletePlaylist: (playlistId: string) => Promise<boolean>;
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<boolean>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<boolean>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [history, setHistory] = useState<PlayHistoryItem[]>([]);
  const [offlineSongs, setOfflineSongs] = useState<Song[]>([]);
  const [offlineSongIds, setOfflineSongIds] = useState<Set<string>>(new Set());
  const [isOfflineSaving, setIsOfflineSaving] = useState<Record<string, boolean>>({});
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<LibraryTab>("home");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [songForPlaylist, setSongForPlaylist] = useState<Song | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const isRefreshingRef = useRef(false);

  // Check online/offline network status
  useEffect(() => {
    if (typeof window !== "undefined") {
      void Promise.resolve().then(() => setIsOnline(navigator.onLine));
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Refresh offline vault songs
  const refreshOfflineSongs = useCallback(async () => {
    try {
      const stored = await offlineStorageService.getAllOfflineSongs();
      setOfflineSongs(stored);
      setOfflineSongIds(new Set(stored.map((s) => s.id)));
    } catch (err) {
      console.error("Failed to load offline songs:", err);
    }
  }, []);

  // Listen to offline changes across the app
  useEffect(() => {
    void Promise.resolve().then(refreshOfflineSongs);

    if (typeof window !== "undefined") {
      const handleOfflineEvent = () => void refreshOfflineSongs();
      window.addEventListener("soundify:offline-change", handleOfflineEvent);
      return () => {
        window.removeEventListener("soundify:offline-change", handleOfflineEvent);
      };
    }
  }, [refreshOfflineSongs]);

  // Hydrate from localStorage on initial render for instant offline presentation
  useEffect(() => {
    if (typeof window === "undefined") return;
    void Promise.resolve().then(() => {
      try {
        const cached = localStorage.getItem("soundify_cached_songs");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSongs(parsed);
            setIsLoading(false);
          }
        }
        const cachedPlaylists = localStorage.getItem("soundify_cached_playlists");
        if (cachedPlaylists) {
          setPlaylists(JSON.parse(cachedPlaylists));
        }
        const cachedFavs = localStorage.getItem("soundify_cached_favorites");
        if (cachedFavs) {
          setFavorites(JSON.parse(cachedFavs));
        }
      } catch {
        // ignore
      }
    });
  }, []);

  const refreshLibrary = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      const [songsData, playlistsData, favsData, historyData] = await Promise.all([
        songService.getSongs().catch(() => null),
        playlistService.getPlaylists().catch(() => null),
        favoriteService.getFavorites().catch(() => null),
        historyService.getHistory().catch(() => null),
      ]);

      if (songsData !== null) {
        const favIds = new Set((favsData || []).map((favorite) => favorite.id));
        const enrichedSongs = songsData.map((song) => ({
          ...song,
          ...(favsData === null ? {} : { isFavorite: favIds.has(song.id) }),
        }));

        if (enrichedSongs.length > 0) {
          setSongs(enrichedSongs);
          try {
            localStorage.setItem("soundify_cached_songs", JSON.stringify(enrichedSongs));
          } catch {}
        } else {
          // Keep explicitly saved offline tracks, but clear stale server songs.
          const stored = await offlineStorageService.getAllOfflineSongs();
          setSongs(stored);
          try {
            localStorage.setItem("soundify_cached_songs", JSON.stringify(stored));
          } catch {}
        }
      }

      if (playlistsData !== null) {
        setPlaylists(playlistsData);
        try {
          localStorage.setItem("soundify_cached_playlists", JSON.stringify(playlistsData));
        } catch {}
      }

      if (favsData !== null) {
        setFavorites(favsData);
        try {
          localStorage.setItem("soundify_cached_favorites", JSON.stringify(favsData));
        } catch {}
      }

      if (historyData !== null) setHistory(historyData);
    } catch (err) {
      console.error("Failed to load music library:", err);
    } finally {
      isRefreshingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initAndRefresh = async () => {
      if (typeof window !== "undefined") {
        await authService.ensureAuth();
      }
      await refreshLibrary();
    };
    void initAndRefresh();
  }, [refreshLibrary]);

  const saveSongOffline = async (song: Song): Promise<boolean> => {
    setIsOfflineSaving((prev) => ({ ...prev, [song.id]: true }));
    try {
      await offlineStorageService.saveSongOffline(song);
      await refreshOfflineSongs();
      return true;
    } catch (error) {
      console.error("Failed to save song offline:", error);
      return false;
    } finally {
      setIsOfflineSaving((prev) => ({ ...prev, [song.id]: false }));
    }
  };

  const removeSongOffline = async (songId: string): Promise<boolean> => {
    try {
      await offlineStorageService.removeSongOffline(songId);
      await refreshOfflineSongs();
      return true;
    } catch (error) {
      console.error("Failed to remove song offline:", error);
      return false;
    }
  };

  const importLocalAudio = async (file: File): Promise<Song | null> => {
    try {
      const newSong = await offlineStorageService.importLocalFile(file);
      await refreshOfflineSongs();
      setSongs((prev) => [newSong, ...prev]);
      return newSong;
    } catch (error) {
      console.error("Failed to import local file:", error);
      return null;
    }
  };

  const toggleFavorite = async (songId: string): Promise<boolean> => {
    const currentIsFav = songs.find((s) => s.id === songId)?.isFavorite ?? false;
    const nextIsFav = !currentIsFav;

    // Optimistic UI update
    setSongs((prev) =>
      prev.map((s) => (s.id === songId ? { ...s, isFavorite: nextIsFav } : s))
    );

    try {
      if (nextIsFav) {
        await favoriteService.addFavorite(songId);
      } else {
        await favoriteService.removeFavorite(songId);
      }

      favoriteService.getFavorites().then(setFavorites).catch(() => {});
      return nextIsFav;
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      setSongs((prev) =>
        prev.map((s) => (s.id === songId ? { ...s, isFavorite: currentIsFav } : s))
      );
      return currentIsFav;
    }
  };

  const deleteSong = async (songId: string): Promise<boolean> => {
    try {
      // Also remove from offline vault if present
      if (offlineSongIds.has(songId)) {
        await offlineStorageService.removeSongOffline(songId);
      }

      const success = await songService.deleteSong(songId);
      if (success) {
        setSongs((prev) => prev.filter((s) => s.id !== songId));
        setFavorites((prev) => prev.filter((s) => s.id !== songId));

        const playerState = usePlayerStore.getState();
        const queueIdx = playerState.queue.findIndex((s) => s.id === songId);
        if (queueIdx !== -1) {
          playerState.removeFromQueue(queueIdx);
        }

        refreshLibrary();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete song:", err);
      return false;
    }
  };

  const deleteAllSongs = async (): Promise<boolean> => {
    try {
      // 1. Clear IndexedDB offline tracks & playback cache
      await offlineStorageService.clearAll();

      // 2. Clear active player state and queue
      const { clearQueue, pause } = usePlayerStore.getState();
      pause();
      clearQueue();

      // 3. Delete all songs from backend API
      await songService.deleteAllSongs().catch(() => {});

      // 4. Reset local library and caches
      setSongs([]);
      setFavorites([]);
      setOfflineSongs([]);
      setOfflineSongIds(new Set());
      try {
        localStorage.removeItem("soundify_cached_songs");
        localStorage.removeItem("soundify_cached_favorites");
      } catch {}

      await refreshLibrary();
      await refreshOfflineSongs();
      return true;
    } catch (err) {
      console.error("Failed to delete all songs:", err);
      setSongs([]);
      setFavorites([]);
      try {
        localStorage.removeItem("soundify_cached_songs");
      } catch {}
      const { clearQueue, pause } = usePlayerStore.getState();
      pause();
      clearQueue();
      return false;
    }
  };

  const createPlaylist = async (
    name: string,
    description?: string
  ): Promise<Playlist | null> => {
    try {
      const newPlaylist = await playlistService.createPlaylist(name, description);
      if (newPlaylist) {
        setPlaylists((prev) => [newPlaylist, ...prev]);
        return newPlaylist;
      }
      return null;
    } catch (err) {
      console.error("Failed to create playlist:", err);
      return null;
    }
  };

  const deletePlaylist = async (playlistId: string): Promise<boolean> => {
    try {
      const success = await playlistService.deletePlaylist(playlistId);
      if (success) {
        setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
        if (selectedPlaylistId === playlistId) {
          setSelectedPlaylistId(null);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete playlist:", err);
      return false;
    }
  };

  const addSongToPlaylist = async (
    playlistId: string,
    songId: string
  ): Promise<boolean> => {
    try {
      const success = await playlistService.addSong(playlistId, songId);
      if (success) {
        refreshLibrary();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to add song to playlist:", err);
      return false;
    }
  };

  const removeSongFromPlaylist = async (
    playlistId: string,
    songId: string
  ): Promise<boolean> => {
    try {
      const success = await playlistService.removeSong(playlistId, songId);
      if (success) {
        refreshLibrary();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to remove song from playlist:", err);
      return false;
    }
  };

  return (
    <LibraryContext.Provider
      value={{
        songs,
        playlists,
        favorites,
        history,
        offlineSongs,
        offlineSongIds,
        isOfflineSaving,
        isOnline,
        isLoading,
        searchQuery,
        setSearchQuery,
        activeTab,
        setActiveTab,
        selectedPlaylistId,
        setSelectedPlaylistId,
        isUploadOpen,
        setIsUploadOpen,
        isPlaylistModalOpen,
        setIsPlaylistModalOpen,
        isAddToPlaylistOpen,
        setIsAddToPlaylistOpen,
        songForPlaylist,
        setSongForPlaylist,
        isShortcutsOpen,
        setIsShortcutsOpen,
        refreshLibrary,
        refreshOfflineSongs,
        saveSongOffline,
        removeSongOffline,
        importLocalAudio,
        toggleFavorite,
        deleteSong,
        deleteAllSongs,
        createPlaylist,
        deletePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error("useLibrary must be used within a LibraryProvider");
  }
  return context;
}
