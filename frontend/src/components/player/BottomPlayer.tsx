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
} from "lucide-react";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { useLibrary } from "@/context/LibraryContext";
import { formatDuration } from "@/lib/utils";

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

  const { toggleFavorite } = useLibrary();
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);
  const [seekHoverPercent, setSeekHoverPercent] = useState<number | null>(null);

  if (!currentSong) {
    return (
      <footer className="hidden md:flex h-20 sm:h-22 bg-white border-t border-slate-200 px-4 md:px-8 items-center justify-between text-slate-500 select-none shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Nothing playing</p>
            <p className="text-xs text-slate-400">Select any song from your library to start</p>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-400 hidden sm:block">
          Press [Space] to play/pause
        </div>
      </footer>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSong.isAuthorizedDownload && !currentSong.isDownloadable) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const downloadUrl = `${apiBase}/songs/${currentSong.id}/download`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${currentSong.artist} - ${currentSong.title}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
    <div className="md:hidden shrink-0 relative flex h-[4.25rem] items-center gap-3 border-t border-slate-200 bg-white px-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-slate-100">
        <div className="h-full bg-blue-600" style={{ width: `${progressPercent}%` }} />
      </div>
      <button
        onClick={toggleExpandedPlayer}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`Open player for ${currentSong.title}`}
      >
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {currentSong.coverUrl ? (
            <Image src={currentSong.coverUrl} alt="" fill unoptimized className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-slate-400"><Music className="h-5 w-5" /></span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900">{currentSong.title}</span>
          <span className="block truncate text-xs text-slate-500">{currentSong.artist}</span>
        </span>
      </button>
      <button onClick={togglePlayPause} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-900 active:bg-slate-100" aria-label={isPlaying ? "Pause" : "Play"}>
        {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
      </button>
      <button onClick={nextSong} className="flex h-11 w-10 shrink-0 items-center justify-center rounded-full text-slate-700 active:bg-slate-100" aria-label="Next song">
        <SkipForward className="h-5 w-5 fill-current" />
      </button>
    </div>
    <footer className="hidden md:flex h-20 sm:h-24 bg-white border-t border-slate-200 px-3 sm:px-6 md:px-8 items-center justify-between gap-2 sm:gap-6 sticky bottom-0 z-40 select-none shadow-lg">
      {/* LEFT: Current Track Info */}
      <div className="flex items-center gap-3 min-w-0 max-w-[200px] sm:max-w-[260px] md:max-w-[300px]">
        {/* Cover Art */}
        <div
          onClick={toggleExpandedPlayer}
          className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer group shadow-xs"
        >
          {currentSong.coverUrl ? (
            <Image
              src={currentSong.coverUrl}
              alt={currentSong.title}
              fill
              unoptimized
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Music className="w-6 h-6" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Title & Artist */}
        <div className="min-w-0 flex-1">
          <p
            onClick={toggleExpandedPlayer}
            className="text-xs sm:text-sm font-bold text-slate-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
            title={currentSong.title}
          >
            {currentSong.title}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 truncate" title={currentSong.artist}>
            {currentSong.artist}
          </p>
        </div>

        {/* Favorite Button */}
        <button
          onClick={() => toggleFavorite(currentSong.id)}
          className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 transition-colors shrink-0"
          title={currentSong.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart
            className={`w-4 h-4 transition-transform active:scale-125 ${
              currentSong.isFavorite
                ? "fill-rose-500 text-rose-500"
                : "text-slate-400 hover:text-slate-600"
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
              isShuffle ? "text-blue-600 font-bold" : "text-slate-400 hover:text-slate-800"
            }`}
            title={`Shuffle: ${isShuffle ? "On" : "Off"}`}
          >
            <Shuffle className="w-4 h-4" />
            {isShuffle && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600" />
            )}
          </button>

          {/* Previous Track */}
          <button
            onClick={prevSong}
            className="p-1.5 text-slate-600 hover:text-slate-900 active:scale-95 transition-all"
            title="Previous (P / Left Arrow)"
          >
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </button>

          {/* Play/Pause Tactile Cobalt Button */}
          <button
            onClick={togglePlayPause}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-90 text-white flex items-center justify-center transition-all shadow-md shadow-blue-500/30"
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
            className="p-1.5 text-slate-600 hover:text-slate-900 active:scale-95 transition-all"
            title="Next (N / Right Arrow)"
          >
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </button>

          {/* Repeat Button */}
          <button
            onClick={cycleRepeat}
            className={`relative p-1.5 rounded-full transition-colors hidden xs:block ${
              repeatMode !== "off" ? "text-blue-600" : "text-slate-400 hover:text-slate-800"
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === "one" ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
            {repeatMode !== "off" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600" />
            )}
          </button>
        </div>

        {/* Scrubber & Timecodes */}
        <div className="w-full flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <span className="w-10 text-right tabular-nums">
            {formatDuration(currentTime)}
          </span>

          <div
            className="relative flex-1 py-2 flex items-center cursor-pointer group"
            onMouseEnter={() => setIsHoveringSeek(true)}
            onMouseLeave={() => {
              setIsHoveringSeek(false);
              setSeekHoverPercent(null);
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setSeekHoverPercent(pct);
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              seek(pct * duration);
            }}
          >
            {/* Background Track */}
            <div className="w-full h-1 sm:h-1.5 bg-slate-200 rounded-full overflow-hidden relative">
              {/* Progress Bar (Cobalt Blue Gradient) */}
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Hover preview tooltip */}
            {isHoveringSeek && seekHoverPercent !== null && duration > 0 && (
              <div
                className="absolute -top-6 px-1.5 py-0.5 rounded bg-[#090a0f] border border-slate-700 text-[10px] text-white -translate-x-1/2 pointer-events-none shadow-md"
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

      {/* RIGHT: Actions (Download, Queue, Volume) */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Authorized Download Button */}
        {(currentSong.isAuthorizedDownload || currentSong.isDownloadable) ? (
          <button
            onClick={handleDownload}
            className="p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Download authorized song"
          >
            <Download className="w-4 h-4" />
          </button>
        ) : (
          <button
            disabled
            className="p-2 rounded-full text-slate-300 cursor-not-allowed opacity-50"
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
              ? "text-blue-600 bg-blue-50"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
          title="Toggle Queue"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Volume Controls */}
        <div className="hidden md:flex items-center gap-2 group">
          <button
            onClick={toggleMute}
            className="p-1.5 text-slate-600 hover:text-slate-900 transition-colors"
            title={isMuted ? "Unmute (M)" : "Mute (M)"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-500" />
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
            className="w-20 sm:w-24 h-1 accent-blue-600"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>
      </div>
    </footer>
    </>
  );
}
