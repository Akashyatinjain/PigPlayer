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
  const [imageError, setImageError] = useState(false);

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
      className={`group flex items-center justify-between gap-1 px-2 sm:px-4 py-2.5 rounded-xl cursor-pointer transition-colors ${
        isCurrent
          ? "bg-blue-600/15 border border-blue-500/35 text-white shadow-xs"
          : "hover:bg-[#161c24] border border-transparent"
      }`}
    >
      {/* LEFT: Index / Play Icon & Track Metadata */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        {/* Track Index or Play button on hover */}
        <div className="w-6 text-center shrink-0 flex items-center justify-center">
          {isCurrent ? (
            <button
              onClick={handlePlay}
              className="text-blue-400 hover:scale-110 transition-transform"
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
                className="hidden group-hover:block text-slate-300 hover:text-blue-400 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail with graceful fallback on 404 */}
        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#161c24] border border-[#232b35] shrink-0">
          {song.coverUrl && !imageError ? (
            <Image
              src={song.coverUrl}
              alt=""
              fill
              unoptimized
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-[#121c2a] to-[#182333] text-blue-400">
              <Music className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Title & Artist */}
        <div className="min-w-0 flex-1 pr-2">
          <p
            className={`text-xs sm:text-sm font-semibold truncate ${
              isCurrent ? "text-blue-400 font-bold" : "text-white"
            }`}
          >
            {song.title}
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">{song.artist}</p>
            {isSavedOffline && (
              <span className="shrink-0 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.2">
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
        <div className="hidden md:block w-48 text-xs text-slate-400 truncate px-2">
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
          className="min-h-11 min-w-11 flex items-center justify-center rounded-full transition-colors hover:text-rose-400"
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
              ? "text-emerald-400 hover:text-rose-400 md:opacity-100"
              : "text-slate-400 hover:text-blue-400 md:opacity-0 md:group-hover:opacity-100"
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
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          ) : isSavedOffline ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <ArrowDownToLine className="w-4 h-4" />
          )}
        </button>

        {/* Add to Playlist button */}
        <button
          onClick={handleAddToPlaylist}
          aria-label={`Add ${song.title} to a playlist`}
          className="min-h-11 min-w-11 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-400 transition-colors md:opacity-0 md:group-hover:opacity-100"
          title="Add to playlist"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Authorized File Download */}
        {song.isAuthorizedDownload && (
          <button
            onClick={handleDownload}
            className="hidden md:flex p-1.5 rounded-full text-slate-400 hover:text-slate-200 transition-colors md:opacity-0 md:group-hover:opacity-100"
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
            className="min-h-11 min-w-11 flex items-center justify-center rounded-full text-slate-400 hover:text-rose-400 transition-colors md:opacity-0 md:group-hover:opacity-100"
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
              className="min-h-11 min-w-11 flex items-center justify-center rounded-full text-slate-400 hover:text-white transition-colors md:opacity-0 md:group-hover:opacity-100"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <button type="button" aria-label="Close song actions" onClick={() => setShowMenu(false)} className="fixed inset-0 z-40 bg-black/60 md:hidden" />
                <div onClick={(e) => e.stopPropagation()} className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-[#232b35] bg-[#12161d] px-4 pb-4 pt-3 shadow-2xl mobile-safe-bottom md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-10 md:w-56 md:rounded-xl md:px-1 md:py-1 md:shadow-xl">
                  <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-slate-700 md:hidden" />
                  <p className="truncate px-3 pb-2 text-xs font-semibold text-slate-400 md:hidden">{song.title}</p>
                  <MenuAction icon={<Play className="h-4 w-4" />} label="Play next" onClick={() => { playNextInQueue(song); setShowMenu(false); }} />
                  <MenuAction icon={<ListPlus className="h-4 w-4" />} label="Add to queue" onClick={() => { addToQueue(song); setShowMenu(false); setQueueOpen(true); }} />
                  <MenuAction
                    icon={
                      isSavingOffline ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      ) : isSavedOffline ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <ArrowDownToLine className="h-4 w-4 text-blue-400" />
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
                  <div className="my-1 border-t border-[#1f2631] md:hidden" />
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
      className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors ${destructive ? "text-rose-400 hover:bg-rose-500/10" : "text-slate-300 hover:bg-[#18202b]"}`}
    >
      {icon}<span>{label}</span>
    </button>
  );
}
