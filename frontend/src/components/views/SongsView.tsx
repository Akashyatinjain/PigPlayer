"use client";

import React, { useState, useMemo } from "react";
import { Play, Shuffle, Music2, ArrowUpDown, Plus } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import SongRow from "@/components/music/SongRow";

type SortOption = "date" | "title" | "artist" | "duration";

export default function SongsView() {
  const { songs, searchQuery, setIsUploadOpen } = useLibrary();
  const { playSong } = usePlayerStore();

  const [sortBy, setSortBy] = useState<SortOption>("date");

  // Filter and sort songs
  const filteredAndSortedSongs = useMemo(() => {
    let result = [...songs];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          (s.album && s.album.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let comp = 0;
      switch (sortBy) {
        case "title":
          comp = a.title.localeCompare(b.title);
          break;
        case "artist":
          comp = a.artist.localeCompare(b.artist);
          break;
        case "duration":
          comp = a.duration - b.duration;
          break;
        case "date":
        default:
          comp =
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime();
          break;
      }
      return comp;
    });

    return result;
  }, [songs, searchQuery, sortBy]);

  const handlePlayAll = () => {
    if (filteredAndSortedSongs.length > 0) {
      playSong(filteredAndSortedSongs[0], filteredAndSortedSongs);
    }
  };

  const handleShufflePlay = () => {
    if (filteredAndSortedSongs.length === 0) return;
    const shuffled = [...filteredAndSortedSongs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232b35] pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            All Songs
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            {filteredAndSortedSongs.length}{" "}
            {filteredAndSortedSongs.length === 1 ? "track" : "tracks"}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {filteredAndSortedSongs.length > 0 && (
            <>
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-full transition-all shadow-md shadow-blue-600/30"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play All</span>
              </button>

              <button
                onClick={handleShufflePlay}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#141922] hover:bg-[#1a212c] border border-[#232b35] text-xs font-semibold text-slate-300 rounded-full transition-all"
              >
                <Shuffle className="w-3.5 h-3.5 text-slate-400" />
                <span>Shuffle</span>
              </button>
            </>
          )}

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-[#141922] border border-[#232b35] px-3 py-1.5 rounded-full text-xs text-slate-300 shadow-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent outline-none cursor-pointer text-xs font-medium text-slate-300"
            >
              <option value="date" className="bg-[#141922] text-white">Date Added</option>
              <option value="title" className="bg-[#141922] text-white">Title</option>
              <option value="artist" className="bg-[#141922] text-white">Artist</option>
              <option value="duration" className="bg-[#141922] text-white">Duration</option>
            </select>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-xs font-semibold text-blue-400 rounded-full transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Song Table */}
      {filteredAndSortedSongs.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-[#0d1015] rounded-2xl border border-[#232b35] p-8 shadow-xs">
          <Music2 className="w-10 h-10 text-slate-500 mx-auto stroke-[1.5]" />
          <h2 className="text-base font-bold text-white">No songs found</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {searchQuery
              ? `No tracks match your query "${searchQuery}". Try searching by another artist, title, or album.`
              : "You haven't added any songs yet. Click Upload to get started."}
          </p>
        </div>
      ) : (
        <div className="bg-[#0d1015] p-2 rounded-2xl border border-[#232b35] shadow-xs space-y-1">
          {/* Table Header */}
          <div className="hidden sm:flex items-center justify-between px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1f2631]">
            <div className="flex items-center gap-4 flex-1">
              <span className="w-5 text-center">#</span>
              <span>Title & Artist</span>
            </div>
            <div className="hidden md:block w-48 px-2">Album</div>
            <div className="flex items-center gap-6">
              <span>Duration</span>
            </div>
          </div>

          {filteredAndSortedSongs.map((song, idx) => (
            <SongRow
              key={song.id}
              song={song}
              index={idx}
              allSongs={filteredAndSortedSongs}
            />
          ))}
        </div>
      )}
    </div>
  );
}
