"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  Download,
  ListMusic,
  Maximize2,
  Music,
  ArrowDownToLine,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { useLibrary } from "@/context/LibraryContext";
import { formatDuration } from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/api";
import { triggerHaptic } from "@/lib/haptics";

export default function BottomPlayer() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    isQueueOpen,
    togglePlayPause,
    nextSong,
    prevSong,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleQueueOpen,
    toggleExpandedPlayer,
  } = usePlayerStore();

  const {
    toggleFavorite,
    offlineSongIds,
    isOfflineSaving,
    saveSongOffline,
    removeSongOffline,
  } = useLibrary();

  const [failedDesktopImgId, setFailedDesktopImgId] = useState<string | null>(null);
  const [failedMobileImgId, setFailedMobileImgId] = useState<string | null>(null);
  const [scrubState, setScrubState] = useState<{ songId: string; value: number } | null>(null);

  const desktopImgErr = currentSong ? failedDesktopImgId === currentSong.id : false;
  const mobileImgErr = currentSong ? failedMobileImgId === currentSong.id : false;
  const isScrubbing = currentSong ? scrubState?.songId === currentSong.id : false;
  const scrubValue = scrubState?.value || 0;

  const isCurrentSavedOffline = currentSong
    ? offlineSongIds.has(currentSong.id) || !!currentSong.isOfflineAvailable
    : false;
  const isCurrentSavingOffline = currentSong
    ? !!isOfflineSaving[currentSong.id]
    : false;

  const handleToggleOfflineCurrent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSong || isCurrentSavingOffline) return;
    if (isCurrentSavedOffline) {
      await removeSongOffline(currentSong.id);
    } else {
      await saveSongOffline(currentSong);
    }
  };

  const [isHoveringSeek, setIsHoveringSeek] = useState(false);
  const [seekHoverPercent, setSeekHoverPercent] = useState<number | null>(null);

  // Horizontal swipe gestures on mobile mini-bar (swipe left for next, right for previous)
  const miniTouchStartX = React.useRef(0);
  const miniTouchStartY = React.useRef(0);
  const handleMiniTouchStart = (e: React.TouchEvent) => {
    miniTouchStartX.current = e.touches[0].clientX;
    miniTouchStartY.current = e.touches[0].clientY;
  };
  const handleMiniTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - miniTouchStartX.current;
    const deltaY = e.changedTouches[0].clientY - miniTouchStartY.current;
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        triggerHaptic("light");
        nextSong();
      } else {
        triggerHaptic("light");
        prevSong();
      }
    }
  };

  if (!currentSong) {
    return (
      <footer className="hidden lg:flex h-20 sm:h-22 bg-[#07090D]/95 glass-player border-t border-white/[0.06] px-4 md:px-8 items-center justify-between text-[#94A3B8] select-none shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[#FF4D80]">
            <Music className="w-5 h-5 text-[#FF4D80]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Nothing playing</p>
            <p className="text-xs text-[#94A3B8]">Select any song from your library to start</p>
          </div>
        </div>
        <div className="text-xs font-mono text-[#64748B] hidden sm:block">
          Press [Space] to play/pause
        </div>
      </footer>
    );
  }

  const displayTime = isScrubbing ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    <>
    <div
      onTouchStart={handleMiniTouchStart}
      onTouchEnd={handleMiniTouchEnd}
      className="lg:hidden shrink-0 relative flex h-[4.1rem] mx-2 mb-1.5 rounded-2xl items-center gap-2.5 border border-white/[0.1] bg-[#0E121A]/95 glass-player px-3 shadow-2xl overflow-hidden select-none"
    >
      <div className="absolute inset-x-0 top-0 h-[2.5px] bg-white/5">
        <div className="h-full bg-[#3B82F6] shadow-sm shadow-[#3B82F6]/50" style={{ width: `${progressPercent}%` }} />
      </div>
      <button
        type="button"
        onClick={() => {
          triggerHaptic("light");
          toggleExpandedPlayer();
        }}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`Open player for ${currentSong.title}`}
      >
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white/[0.06] border border-white/[0.08] shadow-sm">
          {currentSong.coverUrl && !mobileImgErr ? (
            <Image
              src={currentSong.coverUrl}
              alt=""
              fill
              unoptimized
              className="object-cover"
              onError={() => setFailedMobileImgId(currentSong.id)}
            />
          ) : (
            <span className="flex h-full items-center justify-center text-[#FF4D80]"><Music className="h-5 w-5" /></span>
          )}
        </span>
        <span className="min-w-0 flex-1 pr-1">
          <span className="block truncate text-xs sm:text-sm font-semibold text-white leading-tight">{currentSong.title}</span>
          <span className="block truncate text-[11px] text-[#94A3B8] leading-tight mt-0.5">{currentSong.artist}</span>
        </span>
      </button>

      {/* Mobile Mini Bar Action Controls */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Quick Like Button on Mobile Mini Bar */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic("success");
            toggleFavorite(currentSong.id);
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#94A3B8] hover:text-white active:scale-125 transition-transform"
          aria-label={currentSong.isFavorite ? "Remove favorite" : "Favorite"}
        >
          <Heart
            className={`w-4 h-4 ${
              currentSong.isFavorite
                ? "fill-[#FF4D80] text-[#FF4D80]"
                : "text-[#94A3B8]"
            }`}
          />
        </button>

        {/* Play/Pause Button on Mobile Mini Bar */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("medium");
            togglePlayPause();
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 active:scale-95 transition-transform shadow-md"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current translate-x-0.5" />}
        </button>

        {/* Next Track Button on Mobile Mini Bar */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            nextSong();
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#94A3B8] hover:text-white active:scale-90 transition-transform"
          aria-label="Next song"
        >
          <SkipForward className="h-4 w-4 fill-current" />
        </button>
      </div>
    </div>
    <footer className="hidden lg:flex h-20 sm:h-24 bg-[#07090D]/95 glass-player border-t border-white/[0.06] px-3 sm:px-6 md:px-8 items-center justify-between gap-2 sm:gap-6 sticky bottom-0 z-40 select-none shadow-2xl text-[#F8FAFC]">
      {/* LEFT: Current Track Info */}
      <div className="flex items-center gap-3 min-w-0 max-w-[200px] sm:max-w-[260px] md:max-w-[300px]">
        {/* Cover Art */}
        <div
          onClick={toggleExpandedPlayer}
          className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-white/[0.06] border border-white/[0.08] shrink-0 cursor-pointer group shadow-xs"
        >
          {currentSong.coverUrl && !desktopImgErr ? (
            <Image
              src={currentSong.coverUrl}
              alt=""
              fill
              unoptimized
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setFailedDesktopImgId(currentSong.id)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#FF4D80]">
              <Music className="w-6 h-6" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Title & Artist */}
        <div className="min-w-0 flex-1">
          <p
            onClick={toggleExpandedPlayer}
            className="text-xs sm:text-sm font-bold text-white truncate cursor-pointer hover:text-[#FF4D80] transition-colors"
            title={currentSong.title}
          >
            {currentSong.title}
          </p>
          <p className="text-[11px] sm:text-xs text-[#94A3B8] truncate" title={currentSong.artist}>
            {currentSong.artist}
          </p>
        </div>

        {/* Favorite Button */}
        <button
          onClick={() => toggleFavorite(currentSong.id)}
          className="p-1.5 rounded-full text-[#64748B] hover:text-[#FF4D80] transition-colors shrink-0"
          title={currentSong.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart
            className={`w-4 h-4 transition-transform active:scale-125 ${
              currentSong.isFavorite
                ? "fill-[#FF4D80] text-[#FF4D80]"
                : "text-[#64748B] hover:text-[#FF4D80]"
            }`}
          />
        </button>
      </div>

      {/* CENTER: Playback Controls & Scrubber */}
      <div className="flex-1 max-w-xl flex flex-col items-center justify-center gap-1.5 sm:gap-2">
        {/* Control Buttons */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Shuffle Button */}
          <button
            onClick={toggleShuffle}
            className={`relative p-1.5 rounded-full transition-colors hidden xs:block ${
              isShuffle ? "text-[#FF4D80] font-bold" : "text-[#94A3B8] hover:text-white"
            }`}
            title={`Shuffle: ${isShuffle ? "On" : "Off"}`}
          >
            <Shuffle className="w-4 h-4" />
            {isShuffle && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FF4D80]" />
            )}
          </button>

          {/* Previous Track */}
          <button
            onClick={prevSong}
            className="p-1.5 text-[#94A3B8] hover:text-white hover:bg-white/[0.06] rounded-full active:scale-[0.95] transition-all"
            title="Previous (P / Left Arrow)"
          >
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </button>

          {/* Play/Pause Tactile Electric Rose Button */}
          <button
            onClick={togglePlayPause}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#FF4D80] hover:bg-[#FF6694] active:scale-[0.92] text-white flex items-center justify-center transition-all shadow-lg shadow-[#FF4D80]/25"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            ) : (
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current translate-x-0.5" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={nextSong}
            className="p-1.5 text-[#94A3B8] hover:text-white hover:bg-white/[0.06] rounded-full active:scale-[0.95] transition-all"
            title="Next (N / Right Arrow)"
          >
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </button>

          {/* Repeat Button */}
          <button
            onClick={cycleRepeat}
            className={`relative p-1.5 rounded-full transition-colors hidden xs:block ${
              repeatMode !== "off"
                ? "text-[#FF4D80] font-bold"
                : "text-[#94A3B8] hover:text-white"
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === "one" ? (
              <Repeat1 className="w-4 h-4 text-[#FF4D80]" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
            {repeatMode !== "off" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FF4D80]" />
            )}
          </button>
        </div>

        {/* Scrubber Time Bar */}
        <div className="w-full flex items-center gap-2 sm:gap-3 text-[11px] font-mono text-[#94A3B8]">
          <span className="w-10 text-right tabular-nums">
            {formatDuration(displayTime)}
          </span>

          <div
            className="relative flex-1 group"
            onMouseEnter={() => setIsHoveringSeek(true)}
            onMouseLeave={() => {
              setIsHoveringSeek(false);
              setSeekHoverPercent(null);
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = Math.max(
                0,
                Math.min(1, (e.clientX - rect.left) / rect.width)
              );
              setSeekHoverPercent(percent);
            }}
          >
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={displayTime}
              onPointerDown={() => {
                if (currentSong) setScrubState({ songId: currentSong.id, value: currentTime });
              }}
              onChange={(e) => {
                if (currentSong) setScrubState({ songId: currentSong.id, value: parseFloat(e.target.value) });
              }}
              onPointerUp={(e) => {
                setScrubState(null);
                seek(parseFloat((e.target as HTMLInputElement).value));
              }}
              className="player-seek w-full"
              style={
                {
                  "--seek-progress": `${progressPercent}%`,
                } as React.CSSProperties
              }
            />

            {/* Hover preview tooltip */}
            {isHoveringSeek && seekHoverPercent !== null && duration > 0 && (
              <div
                className="absolute -top-6 px-1.5 py-0.5 rounded-lg bg-[#131822] border border-white/[0.1] text-[10px] text-white -translate-x-1/2 pointer-events-none shadow-md"
                style={{ left: `${seekHoverPercent * 100}%` }}
              >
                {formatDuration(seekHoverPercent * duration)}
              </div>
            )}
          </div>

          <span className="w-10 text-left tabular-nums">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* RIGHT: Actions (Offline Save, Download, Queue, Volume) */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Save to Device for Offline */}
        <button
          onClick={handleToggleOfflineCurrent}
          disabled={isCurrentSavingOffline}
          className={`p-2 rounded-full transition-colors ${
            isCurrentSavedOffline
              ? "text-emerald-400 hover:text-rose-400 bg-emerald-500/10"
              : "text-[#94A3B8] hover:text-[#FF4D80] hover:bg-white/[0.06]"
          }`}
          title={
            isCurrentSavingOffline
              ? "Saving offline to device..."
              : isCurrentSavedOffline
              ? "Saved offline on device (click to remove)"
              : "Save to device for offline listening"
          }
        >
          {isCurrentSavingOffline ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#FF4D80]" />
          ) : isCurrentSavedOffline ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <ArrowDownToLine className="w-4 h-4" />
          )}
        </button>

        {/* Authorized Download Button */}
        {(currentSong.isAuthorizedDownload || currentSong.isDownloadable) ? (
          <button
            onClick={handleDownload}
            className="p-2 rounded-full text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Download audio file"
          >
            <Download className="w-4 h-4" />
          </button>
        ) : (
          <button
            disabled
            className="p-2 rounded-full text-[#64748B] cursor-not-allowed opacity-40"
            title="Download not authorized for this track"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {/* Queue Button */}
        <button
          onClick={toggleQueueOpen}
          className={`p-2 rounded-full transition-colors ${
            isQueueOpen
              ? "text-[#FF4D80] bg-[#FF4D80]/15 border border-[#FF4D80]/30"
              : "text-[#94A3B8] hover:text-white hover:bg-white/[0.06]"
          }`}
          title="Toggle Queue"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Volume Controls */}
        <div className="hidden md:flex items-center gap-2 group">
          <button
            onClick={toggleMute}
            className="p-1.5 text-[#94A3B8] hover:text-white transition-colors"
            title={isMuted ? "Unmute (M)" : "Mute (M)"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-[#F43F5E]" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 sm:w-24 h-1 accent-[#3B82F6]"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>
      </div>
    </footer>
    </>
  );
}
