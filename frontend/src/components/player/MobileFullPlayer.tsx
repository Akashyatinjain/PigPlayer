"use client";

import React from "react";
import Image from "next/image";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Download,
  Volume2,
  VolumeX,
  Music,
  ArrowDownToLine,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { useLibrary } from "@/context/LibraryContext";
import { formatDuration } from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/api";

export default function MobileFullPlayer() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    isExpandedPlayerOpen,
    setExpandedPlayer,
    togglePlayPause,
    nextSong,
    prevSong,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
  } = usePlayerStore();

  const {
    toggleFavorite,
    offlineSongIds,
    isOfflineSaving,
    saveSongOffline,
    removeSongOffline,
  } = useLibrary();

  if (!isExpandedPlayerOpen || !currentSong) return null;

  const isCurrentSavedOffline = offlineSongIds.has(currentSong.id) || !!currentSong.isOfflineAvailable;
  const isCurrentSavingOffline = !!isOfflineSaving[currentSong.id];

  const handleToggleOfflineCurrent = async () => {
    if (!currentSong || isCurrentSavingOffline) return;
    if (isCurrentSavedOffline) {
      await removeSongOffline(currentSong.id);
    } else {
      await saveSongOffline(currentSong);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleDownload = () => {
    if (!currentSong.isAuthorizedDownload && !currentSong.isDownloadable) return;
    const downloadUrl = `${getApiBaseUrl()}/songs/${currentSong.id}/download`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${currentSong.artist} - ${currentSong.title}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 min-h-0 overflow-y-auto bg-[#07080b] flex flex-col justify-between px-5 sm:px-8 pb-6 sm:pb-8 mobile-safe-top mobile-safe-bottom animate-in fade-in slide-in-from-bottom-4 duration-200">
      {currentSong.coverUrl && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[18%] mx-auto h-72 w-72 rounded-full opacity-[0.12] blur-[72px]" style={{ backgroundImage: `url("${currentSong.coverUrl}")`, backgroundPosition: "center", backgroundSize: "cover" }} />}
      {/* Top Header */}
      <div className="relative flex items-center justify-between">
        <button
          type="button"
          aria-label="Close player"
          onClick={() => setExpandedPlayer(false)}
          className="flex h-11 w-11 -ml-2 items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-[#151722] transition-colors"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Now Playing
          </p>
          <p className="text-xs text-gray-400 truncate max-w-[200px]">
            {currentSong.album || "piGGyPlayer Library"}
          </p>
        </div>

        <div className="flex items-center gap-1 -mr-2">
          {/* Offline Save Toggle */}
          <button
            type="button"
            aria-label={isCurrentSavedOffline ? "Saved offline (tap to remove)" : "Save for offline playback"}
            onClick={handleToggleOfflineCurrent}
            disabled={isCurrentSavingOffline}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              isCurrentSavedOffline
                ? "text-emerald-400"
                : "text-gray-400 hover:text-white"
            }`}
            title={
              isCurrentSavingOffline
                ? "Saving offline..."
                : isCurrentSavedOffline
                ? "Saved offline (tap to remove)"
                : "Save to device for offline listening"
            }
          >
            {isCurrentSavingOffline ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            ) : isCurrentSavedOffline ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <ArrowDownToLine className="w-5 h-5" />
            )}
          </button>

          {(currentSong.isAuthorizedDownload || currentSong.isDownloadable) ? (
            <button
              type="button"
              aria-label="Download song"
              onClick={handleDownload}
              className="flex h-11 w-11 items-center justify-center rounded-full text-gray-400 hover:text-white transition-colors"
              title="Download song"
            >
              <Download className="w-5 h-5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Album Artwork & Vinyl effect */}
      <div className="relative my-auto py-5 sm:py-6 flex items-center justify-center">
        <div className="relative aspect-square w-full max-w-[20rem] overflow-hidden rounded-[20px] bg-[#12141c] border border-[#232738] shadow-2xl shadow-black/80">
          {currentSong.coverUrl ? (
            <Image
              src={currentSong.coverUrl}
              alt={currentSong.title}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <Music className="w-16 h-16" />
            </div>
          )}
        </div>
      </div>

      {/* Track Details & Favorite */}
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
              {currentSong.title}
            </h2>
            <p className="text-sm sm:text-base text-gray-400 truncate">
              {currentSong.artist}
            </p>
          </div>
          <button
            type="button"
            aria-label={currentSong.isFavorite ? "Remove from favorites" : "Add to favorites"}
            onClick={() => toggleFavorite(currentSong.id)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 hover:text-white transition-colors active:scale-110"
          >
            <Heart
              className={`w-6 h-6 ${
                currentSong.isFavorite
                  ? "fill-[#f43f5e] text-[#f43f5e]"
                  : "text-gray-400"
              }`}
            />
          </button>
        </div>

        {/* Scrubber */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek through song"
            className="player-seek w-full accent-blue-600"
            style={{ "--seek-progress": `${progressPercent}%` } as React.CSSProperties}
          />

          <div className="flex justify-between text-xs font-mono text-gray-400">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-2 pt-2">
          <button
            type="button"
            aria-label={`Shuffle ${isShuffle ? "on" : "off"}`}
            onClick={toggleShuffle}
            className={`flex h-11 w-11 items-center justify-center transition-colors ${
              isShuffle ? "text-blue-500" : "text-gray-400"
            }`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            type="button"
            aria-label="Previous song"
            onClick={prevSong}
            className="flex h-11 w-11 items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={togglePlayPause}
            className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            aria-label="Next song"
            onClick={nextSong}
            className="flex h-11 w-11 items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          <button
            type="button"
            aria-label={`Repeat ${repeatMode}`}
            onClick={cycleRepeat}
            className={`flex h-11 w-11 items-center justify-center transition-colors ${
              repeatMode !== "off" ? "text-blue-500" : "text-gray-400"
            }`}
          >
            {repeatMode === "one" ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 pt-2 px-2 sm:px-4">
          <button type="button" onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"} className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-400">
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="h-11 w-full accent-blue-600"
          />
        </div>
      </div>
    </div>
  );
}
