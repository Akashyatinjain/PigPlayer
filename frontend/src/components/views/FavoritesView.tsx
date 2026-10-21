"use client";

import React from "react";
import { Heart, Play, Shuffle } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import SongRow from "@/components/music/SongRow";
import { formatDuration } from "@/lib/utils";

export default function FavoritesView() {
  const { favorites, setActiveTab } = useLibrary();
  const { playSong, playShuffled } = usePlayerStore();

  const totalDuration = favorites.reduce((acc, s) => acc + (s.duration || 0), 0);

  const handlePlayAll = () => {
    if (favorites.length > 0) {
      playSong(favorites[0], favorites);
    }
  };

  const handleShufflePlay = () => {
    if (favorites.length === 0) return;
    playShuffled(favorites);
  };

  return (
    <div className="space-y-6 pb-12 text-[#f5f7fa]">
      {/* Banner */}
      <div className="p-5 sm:p-8 rounded-2xl bg-[#0d1015] border border-[#232b35] flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 shadow-md">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0 shadow-md">
          <Heart className="w-10 h-10 fill-current" />
        </div>

        <div className="text-center sm:text-left flex-1 space-y-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
            Your collection
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Liked Songs
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            {favorites.length} {favorites.length === 1 ? "track" : "tracks"} •{" "}
            {formatDuration(totalDuration)} total listening time
          </p>

          {favorites.length > 0 && (
            <div className="pt-2.5 flex items-center justify-center sm:justify-start gap-2.5">
              <button
                onClick={handlePlayAll}
                className="flex min-h-10 sm:min-h-11 items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full transition-all shadow-md shadow-blue-500/25 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play All</span>
              </button>
              <button
                onClick={handleShufflePlay}
                className="flex min-h-10 sm:min-h-11 items-center gap-1.5 px-4 py-2 bg-[#141922] hover:bg-[#1a212c] border border-[#232b35] text-xs font-semibold text-slate-300 rounded-full transition-all shadow-xs active:scale-95"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tracks List */}
      {favorites.length === 0 ? (
        <div className="text-center py-14 space-y-3 bg-[#0d1015] rounded-2xl border border-[#232b35] p-6 sm:p-8 shadow-xs">
          <Heart className="w-10 h-10 text-slate-500 mx-auto stroke-[1.5]" />
          <h2 className="text-base font-bold text-white">No favorites yet</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Click the heart icon on any track in your library to keep your favorite songs right here.
          </p>
          <button
            onClick={() => setActiveTab("songs")}
            className="min-h-10 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-full transition-all shadow-xs active:scale-95"
          >
            Explore Library
          </button>
        </div>
      ) : (
        <div className="bg-[#0d1015] p-2 rounded-2xl border border-[#232b35] shadow-xs space-y-1">
          {favorites.map((song, idx) => (
            <SongRow
              key={song.id}
              song={song}
              index={idx}
              allSongs={favorites}
            />
          ))}
        </div>
      )}
    </div>
  );
}
