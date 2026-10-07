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
    <div className="space-y-6 pb-12">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Listening History
        </h1>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Timeline of tracks you have enjoyed recently
        </p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <History className="w-10 h-10 text-slate-400 mx-auto stroke-[1.5]" />
          <h2 className="text-base font-bold text-slate-900">No history yet</h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            As you listen to songs, your history will automatically record here.
          </p>
          <button
            onClick={() => setActiveTab("songs")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white rounded-full transition-all shadow-xs"
          >
            Start Listening
          </button>
        </div>
      ) : (
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs space-y-1">
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
                className={`group flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-all ${
                  isCurrent
                    ? "bg-blue-50/90 border border-blue-200 shadow-xs"
                    : "hover:bg-slate-100/80 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Thumbnail / Play Button */}
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    {item.song.coverUrl ? (
                      <Image
                        src={item.song.coverUrl}
                        alt={item.song.title}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Music2 className="w-4 h-4" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current text-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-current text-white translate-x-0.5" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        isCurrent ? "text-blue-700 font-bold" : "text-slate-900"
                      }`}
                    >
                      {item.song.title}
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                      {item.song.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-400 shrink-0">
                  <span className="hidden sm:inline">
                    {formatTimeAgo(item.playedAt)}
                  </span>
                  <span className="tabular-nums">
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
