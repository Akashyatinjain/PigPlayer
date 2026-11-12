"use client";

import React from "react";
import Image from "next/image";
import { History, Play, Pause, Music2 } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { formatDuration, formatTimeAgo } from "@/lib/utils";

export default function HistoryView() {
  const { history, songs, setActiveTab } = useLibrary();
  const { currentSong, isPlaying, playSong, togglePlayPause } = usePlayerStore();

  return (
    <div className="space-y-6 pb-12 text-[#F8FAFC]">
      <div className="border-b border-white/[0.06] pb-5">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Listening History
        </h1>
        <p className="text-xs text-[#94A3B8] mt-0.5 font-medium">
          Timeline of tracks you have enjoyed recently
        </p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-14 space-y-3 bg-[#0E121A] rounded-2xl border border-white/[0.08] p-6 sm:p-8 shadow-xs">
          <History className="w-10 h-10 text-[#64748B] mx-auto stroke-[1.5]" />
          <h2 className="text-base font-bold text-white">No history yet</h2>
          <p className="text-xs text-[#94A3B8] max-w-xs mx-auto">
            As you listen to songs, your history will automatically record here.
          </p>
          <button
            onClick={() => setActiveTab("songs")}
            className="min-h-10 px-4 py-2 bg-[#FF4D80] hover:bg-[#FF6694] text-xs font-semibold text-white rounded-full transition-all shadow-md shadow-[#FF4D80]/25 active:scale-95"
          >
            Start Listening
          </button>
        </div>
      ) : (
        <div className="bg-[#0E121A] p-2 rounded-2xl border border-white/[0.08] shadow-xs space-y-1">
          {history.map((item, idx) => {
            const isCurrent = currentSong?.id === item.song.id;
            return (
              <div
                key={`${item.id}-${idx}`}
                onClick={() => {
                  if (isCurrent) {
                    togglePlayPause();
                  } else {
                    playSong(item.song, songs);
                  }
                }}
                className={`group flex items-center justify-between px-3 sm:px-4 py-2.5 rounded-xl cursor-pointer transition-all ${
                  isCurrent
                    ? "bg-[#FF4D80]/15 border border-[#FF4D80]/30 text-white shadow-xs"
                    : "hover:bg-white/[0.04] border border-transparent text-[#94A3B8]"
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  {/* Thumbnail / Play Button */}
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/[0.06] border border-white/[0.08] shrink-0">
                    {item.song.coverUrl ? (
                      <Image
                        src={item.song.coverUrl}
                        alt={item.song.title}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#FF4D80]">
                        <Music2 className="w-4 h-4" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current text-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-current text-white translate-x-0.5" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 pr-2">
                    <p
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        isCurrent ? "text-[#FF4D80] font-bold" : "text-white"
                      }`}
                    >
                      {item.song.title}
                    </p>
                    <p className="text-[11px] sm:text-xs text-[#94A3B8] truncate">
                      {item.song.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono text-[#94A3B8] shrink-0">
                  <span className="hidden sm:inline text-[11px]">
                    {formatTimeAgo(item.playedAt)}
                  </span>
                  <span className="tabular-nums text-[11px] sm:text-xs">
                    {formatDuration(item.song.duration)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
