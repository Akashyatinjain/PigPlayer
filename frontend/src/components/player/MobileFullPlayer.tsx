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
import { closeWithHistory } from "@/hooks/useMobileNavigation";
import { triggerHaptic } from "@/lib/haptics";

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

  // Gesture state for swipe-down to dismiss
  const [dragY, setDragY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const touchStartYRef = React.useRef(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleClose = React.useCallback(() => {
    triggerHaptic("light");
    closeWithHistory(() => setExpandedPlayer(false));
  }, [setExpandedPlayer]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if ((containerRef.current?.scrollTop || 0) <= 0) {
      const delta = e.touches[0].clientY - touchStartYRef.current;
      if (delta > 0) {
        setIsDragging(true);
        setDragY(delta);
      }
    }
  };

  const handleTouchEnd = () => {
    if (dragY > 80) {
      handleClose();
    }
    setDragY(0);
    setIsDragging(false);
  };

  if (!isExpandedPlayerOpen || !currentSong) return null;

  const isCurrentSavedOffline = offlineSongIds.has(currentSong.id) || !!currentSong.isOfflineAvailable;
  const isCurrentSavingOffline = !!isOfflineSaving[currentSong.id];

  const handleToggleOfflineCurrent = async () => {
    if (!currentSong || isCurrentSavingOffline) return;
    triggerHaptic("medium");
    if (isCurrentSavedOffline) {
      await removeSongOffline(currentSong.id);
    } else {
      await saveSongOffline(currentSong);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleDownload = () => {
    if (!currentSong.isAuthorizedDownload && !currentSong.isDownloadable) return;
    triggerHaptic("light");
    const downloadUrl = `${getApiBaseUrl()}/songs/${currentSong.id}/download`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${currentSong.artist} - ${currentSong.title}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1), opacity 0.2s ease",
        opacity: dragY > 0 ? Math.max(0.4, 1 - dragY / 320) : 1,
      }}
      className="fixed inset-0 z-50 min-h-0 overflow-y-auto bg-[#07080b] flex flex-col justify-between px-5 sm:px-8 pb-6 sm:pb-8 mobile-safe-top mobile-safe-bottom animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      {/* Mobile Top Drag Indicator */}
      <div
        className="w-12 h-1.5 bg-white/25 hover:bg-white/40 active:bg-white/60 rounded-full mx-auto my-2 shrink-0 cursor-grab active:cursor-grabbing transition-colors"
        onClick={handleClose}
      />

      {currentSong.coverUrl && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[18%] mx-auto h-72 w-72 rounded-full opacity-[0.12] blur-[72px]"
          style={{ backgroundImage: `url("${currentSong.coverUrl}")`, backgroundPosition: "center", backgroundSize: "cover" }}
        />
      )}

      {/* Top Header */}
      <div className="relative flex items-center justify-between">
        <button
          type="button"
          aria-label="Close player"
          onClick={handleClose}
          className="flex h-11 w-11 -ml-2 items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-[#151722] active:scale-90 transition-all"
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

        <div className="flex items-center gap-1.5 -mr-1">
          {/* Offline Save Toggle */}
          <button
            type="button"
            aria-label={isCurrentSavedOffline ? "Saved offline (tap to remove)" : "Save for offline playback"}
            onClick={handleToggleOfflineCurrent}
            disabled={isCurrentSavingOffline}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isCurrentSavedOffline
                ? "text-emerald-400 bg-emerald-500/10"
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
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            ) : isCurrentSavedOffline ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownToLine className="w-4 h-4" />
            )}
          </button>

          {(currentSong.isAuthorizedDownload || currentSong.isDownloadable) ? (
            <button
              type="button"
              aria-label="Download song"
              onClick={handleDownload}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:text-white transition-colors"
              title="Download audio file"
            >
              <Download className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Album Artwork & Vinyl effect - Responsive sizing to guarantee controls fit on screen */}
      <div className="relative my-auto py-2 sm:py-4 flex items-center justify-center">
        <div className="relative aspect-square w-48 max-w-[15rem] sm:max-w-[18rem] max-h-[30vh] sm:max-h-[36vh] overflow-hidden rounded-2xl bg-[#12141c] border border-[#232738] shadow-2xl shadow-black/80">
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
              <Music className="w-12 h-12" />
            </div>
          )}
        </div>
      </div>

      {/* Track Details & Favorite */}
      {/* Track Details & Favorite */}
      <div className="space-y-3.5 sm:space-y-5 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold text-white truncate leading-tight">
              {currentSong.title}
            </h2>
            <p className="text-xs sm:text-base text-gray-400 truncate mt-0.5">
              {currentSong.artist}
            </p>
          </div>
          <button
            type="button"
            aria-label={currentSong.isFavorite ? "Remove from favorites" : "Add to favorites"}
            onClick={() => {
              triggerHaptic("success");
              toggleFavorite(currentSong.id);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 hover:text-white transition-colors active:scale-125"
          >
            <Heart
              className={`w-5 h-5 sm:w-6 sm:h-6 ${
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

          <div className="flex justify-between text-[11px] sm:text-xs font-mono text-gray-400">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-1 pt-1">
          <button
            type="button"
            aria-label={`Shuffle ${isShuffle ? "on" : "off"}`}
            onClick={() => {
              triggerHaptic("light");
              toggleShuffle();
            }}
            className={`flex h-10 w-10 items-center justify-center transition-colors ${
              isShuffle ? "text-blue-500" : "text-gray-400"
            }`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            type="button"
            aria-label="Previous song"
            onClick={() => {
              triggerHaptic("light");
              prevSong();
            }}
            className="flex h-11 w-11 items-center justify-center text-gray-400 hover:text-white transition-colors active:scale-90"
          >
            <SkipBack className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
          </button>

          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={() => {
              triggerHaptic("medium");
              togglePlayPause();
            }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
            ) : (
              <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            aria-label="Next song"
            onClick={() => {
              triggerHaptic("light");
              nextSong();
            }}
            className="flex h-11 w-11 items-center justify-center text-gray-400 hover:text-white transition-colors active:scale-90"
          >
            <SkipForward className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
          </button>

          <button
            type="button"
            aria-label={`Repeat ${repeatMode}`}
            onClick={() => {
              triggerHaptic("light");
              cycleRepeat();
            }}
            className={`flex h-10 w-10 items-center justify-center transition-colors ${
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

        {/* Volume - compact on mobile */}
        <div className="flex items-center gap-2 pt-1 px-1 sm:px-4 opacity-90">
          <button type="button" onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"} className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-400 hover:text-white">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="h-8 w-full accent-blue-600"
          />
        </div>
      </div>
    </div>
  );
}
