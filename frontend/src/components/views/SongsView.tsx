"use client";

import React, { useState, useMemo } from "react";
import { Play, Shuffle, Music2, ArrowUpDown, Plus, Trash2, AlertTriangle, Loader2, HardDriveDownload, FolderPlus } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { offlineStorageService } from "@/services/offline-storage.service";
import { triggerHaptic } from "@/lib/haptics";
import SongRow from "@/components/music/SongRow";
import { Song } from "@/types/music";

type SortOption = "date" | "title" | "artist" | "duration";

export default function SongsView() {
  const { songs, searchQuery, setIsUploadOpen, deleteAllSongs, refreshOfflineSongs } = useLibrary();
  const { playSong, playShuffled } = usePlayerStore();

  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [filterType, setFilterType] = useState<"all" | "local" | "cloud">("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const localInputRef = React.useRef<HTMLInputElement | null>(null);
  const folderInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleLocalFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const audioFiles = Array.from(files).filter((file) =>
      file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac|aac|wma|opus)$/i.test(file.name)
    );
    if (audioFiles.length === 0) return;

    triggerHaptic("medium");
    try {
      const imported: Song[] = [];
      for (const f of audioFiles) {
        const s = await offlineStorageService.importLocalFile(f);
        if (s) imported.push(s);
      }
      await refreshOfflineSongs();
      if (imported.length > 0) {
        playSong(imported[0], imported);
        triggerHaptic("success");
      }
    } catch (err) {
      console.error("Local play error:", err);
    }
  };

  // Filter and sort songs
  const localSongsCount = useMemo(() => songs.filter((s) => s.id.startsWith("local-") || s.isOfflineAvailable).length, [songs]);
  const cloudSongsCount = useMemo(() => songs.filter((s) => !s.id.startsWith("local-")).length, [songs]);

  const filteredAndSortedSongs = useMemo(() => {
    let result = [...songs];

    if (filterType === "local") {
      result = result.filter((s) => s.id.startsWith("local-") || s.isOfflineAvailable);
    } else if (filterType === "cloud") {
      result = result.filter((s) => !s.id.startsWith("local-"));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          (s.album && s.album.toLowerCase().includes(q)) ||
          (s.genre && s.genre.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let comp = 0;
      switch (sortBy) {
        case "title":
          comp = a.title.localeCompare(b.title);
          break;
        case "artist":
          comp = a.artist.localeCompare(b.artist);
          break;
        case "duration":
          comp = a.duration - b.duration;
          break;
        case "date":
        default:
          comp =
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime();
          break;
      }
      return comp;
    });

    return result;
  }, [songs, searchQuery, sortBy, filterType]);

  const handlePlayAll = () => {
    if (filteredAndSortedSongs.length > 0) {
      playSong(filteredAndSortedSongs[0], filteredAndSortedSongs);
    }
  };

  const handleShufflePlay = () => {
    if (filteredAndSortedSongs.length === 0) return;
    playShuffled(filteredAndSortedSongs);
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeleting(true);
    try {
      await deleteAllSongs();
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 text-[#F8FAFC]">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            All Songs
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5 font-medium">
            {filteredAndSortedSongs.length}{" "}
            {filteredAndSortedSongs.length === 1 ? "track" : "tracks"}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {filteredAndSortedSongs.length > 0 && (
            <>
              <button
                onClick={handlePlayAll}
                className="flex min-h-10 sm:min-h-11 items-center gap-1.5 px-4 py-2 bg-[#FF4D80] hover:bg-[#FF6694] active:scale-95 text-white text-xs font-bold rounded-full transition-all shadow-lg shadow-[#FF4D80]/25"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play All</span>
              </button>

              <button
                onClick={handleShufflePlay}
                className="flex min-h-10 sm:min-h-11 items-center gap-1.5 px-3.5 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-[#94A3B8] hover:text-white rounded-full transition-all active:scale-95"
              >
                <Shuffle className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>Shuffle</span>
              </button>
            </>
          )}

          {/* Sort Selector */}
          <div className="flex min-h-10 sm:min-h-11 items-center gap-1.5 bg-white/[0.06] border border-white/[0.08] px-3 py-1.5 rounded-full text-xs text-[#94A3B8] shadow-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent outline-none cursor-pointer text-xs font-medium text-[#94A3B8]"
            >
              <option value="date" className="bg-[#0E121A] text-white">Date Added</option>
              <option value="title" className="bg-[#0E121A] text-white">Title</option>
              <option value="artist" className="bg-[#0E121A] text-white">Artist</option>
              <option value="duration" className="bg-[#0E121A] text-white">Duration</option>
            </select>
          </div>

          {/* Hidden local file input */}
          <input
            ref={localInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.opus"
            onChange={(e) => {
              handleLocalFiles(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
          />

          {/* Hidden folder input */}
          <input
            ref={folderInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is standard in HTML5 browsers
            webkitdirectory=""
            directory=""
            multiple
            onChange={(e) => {
              handleLocalFiles(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="hidden md:flex min-h-11 items-center gap-1.5 px-3 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-[#94A3B8] hover:text-white rounded-full transition-all shadow-xs"
            title="Import an entire folder from this device"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#FF4D80]" />
            <span>Folder</span>
          </button>

          <button
            type="button"
            onClick={() => localInputRef.current?.click()}
            className="flex min-h-10 sm:min-h-11 items-center gap-1.5 px-3 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-xs font-semibold text-emerald-400 rounded-full transition-all shadow-xs active:scale-95"
            title="Play song from this device without uploading to server"
          >
            <HardDriveDownload className="w-3.5 h-3.5" />
            <span>Local</span>
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex min-h-10 sm:min-h-11 items-center gap-1 px-3 py-2 bg-[#FF4D80]/15 hover:bg-[#FF4D80]/25 border border-[#FF4D80]/30 text-xs font-semibold text-[#FF4D80] rounded-full transition-all shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>

          {/* Delete All Button - subtle trash button on mobile */}
          {songs.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="flex min-h-10 sm:min-h-11 items-center justify-center p-2.5 sm:px-3 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 border border-rose-500/25 text-xs font-semibold text-rose-400 hover:text-rose-300 rounded-full transition-all shadow-xs disabled:opacity-50"
              title="Delete all songs from library"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete All</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips: All / Local Storage / Cloud Library with smooth horizontal scroll */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => { triggerHaptic("light"); setFilterType("all"); }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
            filterType === "all"
              ? "bg-[#FF4D80] text-white shadow-md shadow-[#FF4D80]/25"
              : "bg-white/[0.06] text-[#94A3B8] hover:text-white border border-white/[0.08]"
          }`}
        >
          All Songs ({songs.length})
        </button>

        <button
          type="button"
          onClick={() => { triggerHaptic("light"); setFilterType("local"); }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
            filterType === "local"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
              : "bg-emerald-950/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30"
          }`}
        >
          <HardDriveDownload className="w-3.5 h-3.5" />
          <span>Device Local ({localSongsCount})</span>
        </button>

        <button
          type="button"
          onClick={() => { triggerHaptic("light"); setFilterType("cloud"); }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
            filterType === "cloud"
              ? "bg-[#FF4D80] text-white shadow-md shadow-[#FF4D80]/25"
              : "bg-white/[0.06] text-[#94A3B8] hover:text-white border border-white/[0.08]"
          }`}
        >
          Cloud Library ({cloudSongsCount})
        </button>
      </div>

      {/* Song Table */}
      {filteredAndSortedSongs.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-[#0E121A] rounded-2xl border border-white/[0.08] p-8 shadow-xs">
          <Music2 className="w-10 h-10 text-[#64748B] mx-auto stroke-[1.5]" />
          <h2 className="text-base font-bold text-white">No songs found</h2>
          <p className="text-xs text-[#94A3B8] max-w-xs mx-auto">
            {searchQuery
              ? `No tracks match your query "${searchQuery}". Try searching by another artist, title, or album.`
              : "You haven't added any songs yet. Click Upload to get started."}
          </p>
        </div>
      ) : (
        <div className="bg-[#0E121A] p-2 rounded-2xl border border-white/[0.08] shadow-xs space-y-1">
          {/* Table Header */}
          <div className="hidden sm:flex items-center justify-between px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#64748B] border-b border-white/[0.06]">
            <div className="flex items-center gap-4 flex-1">
              <span className="w-5 text-center">#</span>
              <span>Title & Artist</span>
            </div>
            <div className="hidden md:block w-48 px-2">Album</div>
            <div className="flex items-center gap-6">
              <span>Duration</span>
            </div>
          </div>

          {filteredAndSortedSongs.map((song, idx) => (
            <SongRow
              key={song.id}
              song={song}
              index={idx}
              allSongs={filteredAndSortedSongs}
            />
          ))}
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0E121A] border border-white/[0.08] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete All Songs?</h3>
                <p className="text-xs text-[#94A3B8]">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Are you sure you want to permanently delete all <span className="font-bold text-white">{songs.length}</span> songs? All local audio files, artwork, and offline caches will be removed from your device and library.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-[#94A3B8] hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-full transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteAll}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 rounded-full transition-all shadow-md shadow-rose-600/30 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
