"use client";

import React from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  Sparkles,
  Clock,
  Music2,
  Radio,
} from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import SongRow from "@/components/music/SongRow";

export default function HomeView() {
  const { songs, history, setActiveTab, setIsUploadOpen } = useLibrary();
  const { currentSong, isPlaying, playSong, togglePlayPause } = usePlayerStore();

  const featuredSong = currentSong || songs[0];

  return (
    <div className="space-y-8 pb-10">
      {/* Featured / Hero Banner: Deep Obsidian Surface with Electric Cobalt Highlights */}
      {featuredSong ? (
        <div className="relative rounded-2xl overflow-hidden bg-[#090a0f] border border-slate-800 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 shadow-xl">
          {/* Cover Art */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 shadow-2xl">
            {featuredSong.coverUrl ? (
              <Image
                src={featuredSong.coverUrl}
                alt={featuredSong.title}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                <Music2 className="w-12 h-12" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[11px] font-bold tracking-wider uppercase">
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span>{currentSong ? "Now In Rotation" : "Featured Track"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {featuredSong.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 font-medium">
              {featuredSong.artist} {featuredSong.album ? `• ${featuredSong.album}` : ""}
            </p>

            <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
              <button
                onClick={() => {
                  if (currentSong?.id === featuredSong.id) {
                    togglePlayPause();
                  } else {
                    playSong(featuredSong, songs);
                  }
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-full transition-all shadow-md shadow-blue-500/30"
              >
                {currentSong?.id === featuredSong.id && isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current translate-x-0.5" />
                    <span>Play Now</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setActiveTab("songs")}
                className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold rounded-full transition-all"
              >
                Browse All
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center space-y-3 shadow-xs">
          <Radio className="w-10 h-10 text-slate-400 mx-auto stroke-[1.5]" />
          <h2 className="text-lg font-bold text-slate-900">Welcome to Soundify</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Your local music library is ready. No internet required — upload tracks from this machine and play offline.
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-full shadow-sm hover:bg-blue-700 transition-colors"
          >
            Upload First Song
          </button>
        </div>
      )}

      {/* Recently Played Section */}
      {history.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-extrabold text-slate-900 tracking-wide">
                Recently Played
              </h2>
            </div>
            <button
              onClick={() => setActiveTab("history")}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              View All History
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {history.slice(0, 5).map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                onClick={() => playSong(item.song, songs)}
                className="group p-3 rounded-2xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer flex flex-col gap-2.5 shadow-xs hover:shadow-md"
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100">
                  {item.song.coverUrl ? (
                    <Image
                      src={item.song.coverUrl}
                      alt={item.song.title}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Music2 className="w-6 h-6" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-current translate-x-0.5" />
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {item.song.title}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {item.song.artist}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Library Highlights: All Songs Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-extrabold text-slate-900 tracking-wide">
              Music Library
            </h2>
          </div>
          <button
            onClick={() => setActiveTab("songs")}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            Show All ({songs.length})
          </button>
        </div>

        <div className="space-y-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
          {songs.slice(0, 6).map((song, idx) => (
            <SongRow
              key={song.id}
              song={song}
              index={idx}
              allSongs={songs}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
