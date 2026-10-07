"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Song, Playlist, PlayHistoryItem } from "@/types/music";
import { songService } from "@/services/song.service";
import { playlistService } from "@/services/playlist.service";
import { favoriteService } from "@/services/favorite.service";
import { historyService } from "@/services/history.service";

interface LibraryContextType {
  songs: Song[];
  playlists: Playlist[];
  favorites: Song[];
  history: PlayHistoryItem[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeTab: "home" | "songs" | "favorites" | "playlists" | "history" | "settings";
  setActiveTab: (tab: "home" | "songs" | "favorites" | "playlists" | "history" | "settings") => void;
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
  toggleFavorite: (songId: string) => Promise<boolean>;
  deleteSong: (songId: string) => Promise<boolean>;
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
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "home" | "songs" | "favorites" | "playlists" | "history" | "settings"
  >("home");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [songForPlaylist, setSongForPlaylist] = useState<Song | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const refreshLibrary = useCallback(async () => {
    try {
      const [songsData, playlistsData, favsData, historyData] = await Promise.all([
        songService.getSongs().catch(() => []),
        playlistService.getPlaylists().catch(() => []),
        favoriteService.getFavorites().catch(() => []),
        historyService.getHistory().catch(() => []),
      ]);

      const favIds = new Set(favsData.map((f) => f.id));
      const enrichedSongs = songsData.map((s) => ({
        ...s,
        isFavorite: favIds.has(s.id),
      }));

      setSongs(enrichedSongs);
      setPlaylists(playlistsData);
      setFavorites(favsData);
      setHistory(historyData);
    } catch (err) {
      console.error("Failed to load music library:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

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

      // Refresh favorites in background
      favoriteService.getFavorites().then(setFavorites).catch(() => {});
      return nextIsFav;
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      // Revert on error
      setSongs((prev) =>
        prev.map((s) => (s.id === songId ? { ...s, isFavorite: currentIsFav } : s))
      );
      return currentIsFav;
    }
  };

  const deleteSong = async (songId: string): Promise<boolean> => {
    try {
      const success = await songService.deleteSong(songId);
      if (success) {
        setSongs((prev) => prev.filter((s) => s.id !== songId));
        setFavorites((prev) => prev.filter((s) => s.id !== songId));
        refreshLibrary();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete song:", err);
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
        toggleFavorite,
        deleteSong,
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
