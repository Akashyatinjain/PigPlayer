"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  HardDriveDownload,
  Wifi,
  WifiOff,
  Play,
  Upload,
  Trash2,
  Music2,
  Search,
  Sparkles,
} from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { offlineStorageService } from "@/services/offline-storage.service";
import SongRow from "@/components/music/SongRow";

export default function OfflineView() {
  const {
    offlineSongs,
    isOnline,
    importLocalAudio,
    refreshOfflineSongs,
    setActiveTab,
  } = useLibrary();

  const { playSong } = usePlayerStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [storageInfo, setStorageInfo] = useState<{ usedBytes: number; quotaBytes: number; count: number }>({
    usedBytes: 0,
    quotaBytes: 0,
    count: 0,
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    offlineStorageService.getStorageInfo().then(setStorageInfo).catch(() => {});
  }, [offlineSongs.length]);

  const filteredSongs = searchQuery.trim()
    ? offlineSongs.filter((song) =>
        `${song.title} ${song.artist} ${song.album || ""}`
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      )
    : offlineSongs;

  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await importLocalAudio(files[i]);
      }
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePlayAll = () => {
    if (filteredSongs.length > 0) {
      playSong(filteredSongs[0], filteredSongs);
    }
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        "Are you sure you want to remove all downloaded songs from this device? You can re-download them anytime."
      )
    ) {
      await offlineStorageService.clearAll();
      await refreshOfflineSongs();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hidden file input for importing device songs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-sm">
                <HardDriveDownload className="w-3.5 h-3.5" />
                Device Storage
              </span>

              {isOnline ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Wifi className="w-3 h-3" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  <WifiOff className="w-3 h-3" /> Offline Mode Active
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Offline Music Vault
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Songs saved directly into your device&apos;s browser memory (IndexedDB).
              Play, search, and enjoy them anytime with zero internet connection.
            </p>

            <div className="flex items-center gap-4 pt-1 text-xs text-slate-400 font-mono">
              <span>{offlineSongs.length} tracks saved</span>
              <span>•</span>
              <span>{formatBytes(storageInfo.usedBytes)} used</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {filteredSongs.length > 0 && (
              <button
                type="button"
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-transform active:scale-95 shadow-lg shadow-blue-600/30"
              >
                <Play className="w-4 h-4 fill-current" />
                Play Offline
              </button>
            )}

            <button
              type="button"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm transition-colors active:scale-95"
              title="Import audio files from this phone/computer into offline library"
            >
              <Upload className="w-4 h-4" />
              <span>{isImporting ? "Importing..." : "Import Device Audio"}</span>
            </button>

            {offlineSongs.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center justify-center p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
                title="Clear all offline songs from device"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Search Bar */}
      {offlineSongs.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your offline songs..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
          />
        </div>
      )}

      {/* Song List or Empty State */}
      {offlineSongs.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <HardDriveDownload className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            No offline songs stored yet
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Save any song by clicking the download icon on a track, or import MP3 files
            directly from your mobile/computer storage to play offline anytime.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-transform active:scale-95 shadow-md shadow-blue-500/20"
            >
              <Upload className="w-4 h-4" />
              Import MP3 from this Device
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("songs")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition-colors"
            >
              <Music2 className="w-4 h-4" />
              Browse Library to Save
            </button>
          </div>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            No offline songs match &ldquo;{searchQuery}&rdquo;.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {filteredSongs.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              index={index}
              allSongs={filteredSongs}
            />
          ))}
        </div>
      )}
    </div>
  );
}
