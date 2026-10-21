"use client";

import React from "react";
import Image from "next/image";
import { X, Trash2, Music, Volume2 } from "lucide-react";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { formatDuration } from "@/lib/utils";
import { closeWithHistory } from "@/hooks/useMobileNavigation";
import { triggerHaptic } from "@/lib/haptics";

export default function QueueDrawer() {
  const {
    queue,
    currentIndex,
    isPlaying,
    isQueueOpen,
    setQueueOpen,
    playQueueItem,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  if (!isQueueOpen) return null;

  const handleClose = () => {
    triggerHaptic("light");
    closeWithHistory(() => setQueueOpen(false));
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close queue"
        onClick={handleClose}
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs transition-opacity"
      />
      <aside
        aria-label="Play queue"
        className="mobile-safe-bottom fixed inset-x-0 bottom-0 top-auto max-h-[85dvh] w-full rounded-t-3xl bg-[#0e121a] border border-[#222b37] text-[#f5f7fa] z-50 flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-200 md:inset-y-0 md:left-auto md:right-0 md:top-0 md:max-h-full md:w-84 md:rounded-none md:border-l md:border-t-0 md:animate-in md:slide-in-from-right"
      >
        {/* Mobile Top Drag Indicator */}
        <div
          className="w-12 h-1.5 bg-white/20 hover:bg-white/40 active:bg-white/60 rounded-full mx-auto my-2.5 md:hidden shrink-0 cursor-grab"
          onClick={handleClose}
        />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1f2635] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Up Next
            </h2>
            <p className="text-xs text-slate-400">
              {queue.length} {queue.length === 1 ? "track" : "tracks"} in queue
            </p>
          </div>

          <div className="flex items-center gap-1">
            {queue.length > 0 && (
              <button
                type="button"
                aria-label="Clear queue"
                onClick={() => {
                  triggerHaptic("warning");
                  clearQueue();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Clear queue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              aria-label="Close queue"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#161c26] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Queue Tracks List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {queue.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Music className="w-8 h-8 mb-2 stroke-[1.5] text-blue-400" />
              <p className="text-sm font-semibold text-white">Queue is empty</p>
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
                      ? "bg-blue-600/15 border border-blue-500/30 text-white shadow-xs"
                      : "hover:bg-[#161c28] text-slate-300"
                  }`}
                >
                  <div
                    onClick={() => {
                      triggerHaptic("light");
                      playQueueItem(idx);
                    }}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    {/* Thumbnail / Indicator */}
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#141922] shrink-0 border border-[#232b35]">
                      {song.coverUrl ? (
                        <Image
                          src={song.coverUrl}
                          alt={song.title}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-400">
                          <Music className="w-4 h-4" />
                        </div>
                      )}
                      {isCurrent && isPlaying && (
                        <div className="absolute inset-0 bg-blue-600/70 flex items-center justify-center text-white">
                          <Volume2 className="w-4 h-4 animate-pulse" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isCurrent ? "text-blue-400 font-bold" : "text-white"
                        }`}
                      >
                        {song.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {song.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-[10px] font-mono text-slate-400">
                      {formatDuration(song.duration)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic("light");
                        removeFromQueue(idx);
                      }}
                      aria-label={`Remove ${song.title} from queue`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
    </>
  );
}
