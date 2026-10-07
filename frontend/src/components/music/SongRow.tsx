"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  Heart,
  Plus,
  Download,
  Trash2,
  Music,
  MoreVertical,
  ListPlus,
  ArrowDownToLine,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Song } from "@/types/music";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { useLibrary } from "@/context/LibraryContext";
import { formatDuration } from "@/lib/utils";

interface SongRowProps {
  song: Song;
  index: number;
  allSongs?: Song[];
  showAlbum?: boolean;
  onRemoveFromPlaylist?: () => void;
}

export default function SongRow({
  song,
  index,
  allSongs,
  showAlbum = true,
  onRemoveFromPlaylist,
}: SongRowProps) {
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlayPause,
    playNextInQueue,
    addToQueue,
    setQueueOpen,
  } = usePlayerStore();
  const {
    toggleFavorite,
    deleteSong,
    setIsAddToPlaylistOpen,
    setSongForPlaylist,
    offlineSongIds,
    isOfflineSaving,
    saveSongOffline,
    removeSongOffline,
  } = useLibrary();

  const [showMenu, setShowMenu] = useState(false);

  const isCurrent = currentSong?.id === song.id;
  const isSavedOffline = offlineSongIds.has(song.id) || !!song.isOfflineAvailable;
  const isSavingOffline = !!isOfflineSaving[song.id];

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlayPause();
    } else {
      playSong(song, allSongs);
    }
  };

  const handleToggleOffline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSavingOffline) return;
    if (isSavedOffline) {
      await removeSongOffline(song.id);
    } else {
      await saveSongOffline(song);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!song.isAuthorizedDownload && !song.isDownloadable) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const downloadUrl = `${apiUrl}/songs/${song.id}/download`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${song.artist} - ${song.title}`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSongForPlaylist(song);
    setIsAddToPlaylistOpen(true);
  };

  return (
    <div
      onClick={handlePlay}
      onDoubleClick={handlePlay}
      className={`group flex items-center justify-between gap-1 px-2 sm:px-4 py-2.5 rounded-xl cursor-pointer transition-all ${
        isCurrent
          ? "bg-blue-50/90 border border-blue-200 shadow-xs"
          : "hover:bg-slate-100/80 border border-transparent"
      }`}
    >
      {/* LEFT: Index / Play Icon & Track Metadata */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        {/* Track Index or Play button on hover */}
        <div className="w-6 text-center shrink-0 flex items-center justify-center">
          {isCurrent ? (
            <button
              onClick={handlePlay}
              className="text-blue-600 hover:scale-110 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>
          ) : (
            <>
              <span className="text-xs font-mono text-slate-400 group-hover:hidden">
                {index + 1}
              </span>
              <button
                onClick={handlePlay}
                className="hidden group-hover:block text-slate-700 hover:text-blue-600 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail */}
        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
          {song.coverUrl ? (
            <Image
              src={song.coverUrl}
              alt={song.title}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Music className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Title & Artist */}
        <div className="min-w-0 flex-1 pr-2">
          <p
            className={`text-xs sm:text-sm font-semibold truncate ${
              isCurrent ? "text-blue-700" : "text-slate-900"
            }`}
          >
            {song.title}
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">{song.artist}</p>
            {isSavedOffline && (
              <span className="shrink-0 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.2">
                Offline
              </span>
            )}
            {isCurrent && isPlaying && (
              <span aria-label="Now playing" className="playing-bars shrink-0">
                <i /><i /><i />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CENTER: Album Name (Desktop only) */}
      {showAlbum && (
        <div className="hidden md:block w-48 text-xs text-slate-500 truncate px-2">
          {song.album || "—"}
        </div>
      )}

      {/* RIGHT: Actions & Duration */}
      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(song.id);
          }}
          aria-label={song.isFavorite ? `Remove ${song.title} from favorites` : `Add ${song.title} to favorites`}
          className="min-h-11 min-w-11 flex items-center justify-center rounded-full transition-colors hover:text-rose-500"
          title={song.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart
            className={`w-4 h-4 ${
              song.isFavorite
                ? "fill-rose-500 text-rose-500"
                : "text-slate-400 md:opacity-0 md:group-hover:opacity-100"
            }`}
          />
        </button>

        {/* Save for Offline (IndexedDB Toggle) */}
        <button
          onClick={handleToggleOffline}
          disabled={isSavingOffline}
          aria-label={isSavedOffline ? "Saved offline (tap to remove)" : "Save for offline playback"}
          className={`min-h-11 min-w-11 flex items-center justify-center rounded-full transition-colors ${
            isSavedOffline
              ? "text-emerald-600 hover:text-rose-500 md:opacity-100"
              : "text-slate-400 hover:text-blue-600 md:opacity-0 md:group-hover:opacity-100"
          }`}
          title={
            isSavingOffline
              ? "Saving offline to device..."
              : isSavedOffline
              ? "Saved offline on device (click to remove)"
              : "Save to device for offline playback"
          }
        >
          {isSavingOffline ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : isSavedOffline ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <ArrowDownToLine className="w-4 h-4" />
          )}
        </button>

        {/* Add to Playlist button */}
        <button
          onClick={handleAddToPlaylist}
          aria-label={`Add ${song.title} to a playlist`}
          className="min-h-11 min-w-11 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-600 transition-colors md:opacity-0 md:group-hover:opacity-100"
          title="Add to playlist"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Authorized File Download (Save MP3 to computer) */}
        {song.isAuthorizedDownload && (
          <button
            onClick={handleDownload}
            className="hidden md:flex p-1.5 rounded-full text-slate-400 hover:text-slate-800 transition-colors md:opacity-0 md:group-hover:opacity-100"
            title="Download audio file to computer"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {/* Remove from playlist or Delete song */}
        {onRemoveFromPlaylist ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveFromPlaylist();
            }}
            aria-label="Remove song from playlist"
            className="min-h-11 min-w-11 flex items-center justify-center rounded-full text-slate-400 hover:text-rose-600 transition-colors md:opacity-0 md:group-hover:opacity-100"
            title="Remove from playlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              aria-label={`More actions for ${song.title}`}
              className="min-h-11 min-w-11 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-800 transition-colors md:opacity-0 md:group-hover:opacity-100"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <button type="button" aria-label="Close song actions" onClick={() => setShowMenu(false)} className="fixed inset-0 z-40 bg-black/50 md:hidden" />
                <div onClick={(e) => e.stopPropagation()} className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-slate-200 bg-white px-4 pb-4 pt-3 shadow-2xl mobile-safe-bottom md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-10 md:w-56 md:rounded-xl md:px-1 md:py-1 md:shadow-xl">
                  <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-slate-300 md:hidden" />
                  <p className="truncate px-3 pb-2 text-xs font-semibold text-slate-500 md:hidden">{song.title}</p>
                  <MenuAction icon={<Play className="h-4 w-4" />} label="Play next" onClick={() => { playNextInQueue(song); setShowMenu(false); }} />
                  <MenuAction icon={<ListPlus className="h-4 w-4" />} label="Add to queue" onClick={() => { addToQueue(song); setShowMenu(false); setQueueOpen(true); }} />
                  <MenuAction
                    icon={
                      isSavingOffline ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      ) : isSavedOffline ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <ArrowDownToLine className="h-4 w-4 text-blue-500" />
                      )
                    }
                    label={
                      isSavingOffline
                        ? "Saving offline..."
                        : isSavedOffline
                        ? "Remove from offline"
                        : "Save for offline"
                    }
                    onClick={(e) => {
                      handleToggleOffline(e);
                      setShowMenu(false);
                    }}
                  />
                  {song.isAuthorizedDownload && (
                    <MenuAction icon={<Download className="h-4 w-4" />} label="Download audio file" onClick={(e) => { handleDownload(e); setShowMenu(false); }} />
                  )}
                  <div className="my-1 border-t border-slate-100 md:hidden" />
                  <MenuAction destructive icon={<Trash2 className="h-4 w-4" />} label="Delete song" onClick={() => { if (window.confirm(`Delete “${song.title}”?`)) deleteSong(song.id); setShowMenu(false); }} />
                </div>
              </>
            )}
          </div>
        )}

        {/* Track Duration */}
        <span className="hidden w-10 text-right text-[10px] font-mono text-slate-400 tabular-nums sm:inline sm:w-12 sm:text-xs">
          {formatDuration(song.duration)}
        </span>
      </div>
    </div>
  );
}

function MenuAction({
  icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors ${destructive ? "text-rose-500 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50"}`}
    >
      {icon}<span>{label}</span>
    </button>
  );
}
