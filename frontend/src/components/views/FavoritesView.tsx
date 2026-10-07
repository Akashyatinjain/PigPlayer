"use client";

import React from "react";
import { Heart, Play, Shuffle } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import SongRow from "@/components/music/SongRow";
import { formatDuration } from "@/lib/utils";

export default function FavoritesView() {
  const { favorites, setActiveTab } = useLibrary();
  const { playSong } = usePlayerStore();

  const totalDuration = favorites.reduce((acc, s) => acc + (s.duration || 0), 0);

  const handlePlayAll = () => {
    if (favorites.length > 0) {
      playSong(favorites[0], favorites);
    }
  };

  const handleShufflePlay = () => {
    if (favorites.length === 0) return;
    const shuffled = [...favorites].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center gap-6 shadow-xs">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-blue-500 shrink-0">
          <Heart className="w-10 h-10 fill-current" />
        </div>

        <div className="text-center sm:text-left flex-1 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
            Your collection
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Liked Songs
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {favorites.length} {favorites.length === 1 ? "track" : "tracks"} •{" "}
            {formatDuration(totalDuration)} total listening time
          </p>

          {favorites.length > 0 && (
            <div className="pt-3 flex items-center justify-center sm:justify-start gap-3">
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full transition-all shadow-sm shadow-blue-500/25 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play All</span>
              </button>
              <button
                onClick={handleShufflePlay}
                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-full transition-all shadow-xs"
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
        <div className="text-center py-16 space-y-3 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <Heart className="w-10 h-10 text-slate-300 mx-auto stroke-[1.5]" />
          <h2 className="text-base font-bold text-slate-900">No favorites yet</h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Click the heart icon on any track in your library to keep your favorite songs right here.
          </p>
          <button
            onClick={() => setActiveTab("songs")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white rounded-full transition-all shadow-xs"
          >
            Explore Library
          </button>
        </div>
      ) : (
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs space-y-1">
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
