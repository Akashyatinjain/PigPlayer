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
  const { currentSong, isPlaying, playSong, togglePlayPause } = usePlayerStore();
  const {
    toggleFavorite,
    deleteSong,
    setIsAddToPlaylistOpen,
    setSongForPlaylist,
  } = useLibrary();

  const [showMenu, setShowMenu] = useState(false);

  const isCurrent = currentSong?.id === song.id;

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlayPause();
    } else {
      playSong(song, allSongs);
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
        <div className="w-5 text-center shrink-0 flex items-center justify-center">
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
          <p className="text-[11px] sm:text-xs text-slate-500 truncate">
            {song.artist}
          </p>
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
        {/* Favorite Heart */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(song.id);
          }}
          className="min-h-10 min-w-9 flex items-center justify-center rounded-full text-slate-400 hover:text-rose-500 transition-colors"
          title={song.isFavorite ? "Remove favorite" : "Add to favorites"}
        >
          <Heart
            className={`w-4 h-4 ${
              song.isFavorite
                ? "fill-rose-500 text-rose-500"
                : "text-slate-400 md:opacity-0 md:group-hover:opacity-100"
            }`}
          />
        </button>

        {/* Add to Playlist button */}
        <button
          onClick={handleAddToPlaylist}
          className="min-h-10 min-w-9 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-600 transition-colors md:opacity-0 md:group-hover:opacity-100"
          title="Add to playlist"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Authorized Download */}
        {song.isAuthorizedDownload && (
          <button
            onClick={handleDownload}
            className="hidden md:flex p-1.5 rounded-full text-slate-400 hover:text-slate-800 transition-colors md:opacity-0 md:group-hover:opacity-100"
            title="Download song"
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
            className="min-h-10 min-w-9 flex items-center justify-center rounded-full text-slate-400 hover:text-rose-600 transition-colors md:opacity-0 md:group-hover:opacity-100"
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
              className="min-h-10 min-w-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-800 transition-colors md:opacity-0 md:group-hover:opacity-100"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-8 z-30 w-36 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs"
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    deleteSong(song.id);
                  }}
                  className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete track</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Track Duration */}
        <span className="w-10 sm:w-12 text-right text-[10px] sm:text-xs font-mono text-slate-400 tabular-nums">
          {formatDuration(song.duration)}
        </span>
      </div>
    </div>
  );
}
