"use client";

import React from "react";
import Image from "next/image";
import { X, Trash2, Music, Volume2 } from "lucide-react";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { formatDuration } from "@/lib/utils";

export default function QueueDrawer() {
  const {
    queue,
    currentIndex,
    isPlaying,
    isQueueOpen,
    setQueueOpen,
    playSong,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  if (!isQueueOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
            Up Next
          </h2>
          <p className="text-xs text-slate-500">
            {queue.length} {queue.length === 1 ? "track" : "tracks"} in queue
          </p>
        </div>

        <div className="flex items-center gap-1">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Clear queue"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setQueueOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Queue Tracks List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Music className="w-8 h-8 mb-2 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-700">Queue is empty</p>
            <p className="text-xs text-slate-400 mt-1">
              Click play on any song or add tracks from your library
            </p>
          </div>
        ) : (
          queue.map((song, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={`${song.id}-${idx}`}
                className={`group flex items-center justify-between p-2 rounded-xl transition-all ${
                  isCurrent
                    ? "bg-blue-50 border border-blue-200 text-blue-900 shadow-xs"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div
                  onClick={() => playSong(song, queue)}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  {/* Thumbnail / Indicator */}
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
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
                    {isCurrent && isPlaying && (
                      <div className="absolute inset-0 bg-blue-600/60 flex items-center justify-center text-white">
                        <Volume2 className="w-4 h-4 animate-pulse" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-semibold truncate ${
                        isCurrent ? "text-blue-700 font-bold" : "text-slate-900"
                      }`}
                    >
                      {song.title}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {song.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    {formatDuration(song.duration)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(idx);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                    title="Remove from queue"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
