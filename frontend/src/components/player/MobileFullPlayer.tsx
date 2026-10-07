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
} from "lucide-react";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { useLibrary } from "@/context/LibraryContext";
import { formatDuration } from "@/lib/utils";

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

  const { toggleFavorite } = useLibrary();

  if (!isExpandedPlayerOpen || !currentSong) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleDownload = () => {
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
    <div className="fixed inset-0 z-50 min-h-0 overflow-y-auto bg-[#07080b] flex flex-col justify-between px-5 sm:px-8 pb-6 sm:pb-8 mobile-safe-top mobile-safe-bottom animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpandedPlayer(false)}
          className="p-2 -ml-2 rounded-full text-gray-400 hover:text-white hover:bg-[#151722] transition-colors"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Now Playing
          </p>
          <p className="text-xs text-gray-400 truncate max-w-[200px]">
            {currentSong.album || "Soundify Library"}
          </p>
        </div>

        {(currentSong.isAuthorizedDownload || currentSong.isDownloadable) ? (
          <button
            onClick={handleDownload}
            className="p-2 -mr-2 rounded-full text-gray-400 hover:text-white transition-colors"
            title="Download song"
          >
            <Download className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-9" />
        )}
      </div>

      {/* Album Artwork & Vinyl effect */}
      <div className="my-auto py-5 sm:py-6 flex items-center justify-center">
        <div className="relative h-[min(68vw,18rem)] w-[min(68vw,18rem)] sm:h-80 sm:w-80 rounded-2xl overflow-hidden bg-[#12141c] border border-[#232738] shadow-2xl shadow-black/80">
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
            onClick={() => toggleFavorite(currentSong.id)}
            className="p-2 rounded-full text-gray-400 hover:text-white transition-colors"
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
            onClick={toggleShuffle}
            className={`p-2 transition-colors ${
              isShuffle ? "text-blue-500" : "text-gray-400"
            }`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={prevSong}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          <button
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
            onClick={nextSong}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`p-2 transition-colors ${
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
        <div className="flex items-center gap-3 pt-2 px-4">
          <button onClick={toggleMute} className="text-gray-400">
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
      </div>
    </div>
  );
}
