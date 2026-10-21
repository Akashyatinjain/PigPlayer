"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  FolderPlus,
  Play,
  Shuffle,
  Trash2,
  ArrowLeft,
  Music2,
  Library,
  Plus,
} from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import SongRow from "@/components/music/SongRow";
import { Playlist, Song } from "@/types/music";
import { formatDuration } from "@/lib/utils";
import { playlistService } from "@/services/playlist.service";
import { closeWithHistory } from "@/hooks/useMobileNavigation";
import { triggerHaptic } from "@/lib/haptics";

export default function PlaylistsView() {
  const {
    playlists,
    selectedPlaylistId,
    setSelectedPlaylistId,
    setIsPlaylistModalOpen,
    deletePlaylist,
    removeSongFromPlaylist,
    setActiveTab,
  } = useLibrary();

  const { playSong, playShuffled } = usePlayerStore();

  const [activePlaylistData, setActivePlaylistData] = useState<Playlist | null>(
    null
  );
  const [loadedPlaylistId, setLoadedPlaylistId] = useState<string | null>(null);
  const loadingPlaylist = Boolean(selectedPlaylistId && loadedPlaylistId !== selectedPlaylistId);

  // Fetch full playlist data when selectedPlaylistId changes
  useEffect(() => {
    if (!selectedPlaylistId) return;
    let cancelled = false;
    playlistService
      .getPlaylist(selectedPlaylistId)
      .then((data) => {
        if (!cancelled) {
          setActivePlaylistData(data);
          setLoadedPlaylistId(selectedPlaylistId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActivePlaylistData(null);
          setLoadedPlaylistId(selectedPlaylistId);
        }
      });
    return () => { cancelled = true; };
  }, [selectedPlaylistId]);

  const playlistSongs: Song[] =
    activePlaylistData?.songs?.map((ps) => ps.song) || [];

  const totalDuration = playlistSongs.reduce(
    (acc, s) => acc + (s.duration || 0),
    0
  );

  const handlePlayAll = () => {
    if (playlistSongs.length > 0) {
      playSong(playlistSongs[0], playlistSongs);
    }
  };

  const handleShufflePlay = () => {
    if (playlistSongs.length === 0) return;
    playShuffled(playlistSongs);
  };

  const handleDelete = async () => {
    if (!selectedPlaylistId) return;
    if (confirm("Are you sure you want to delete this playlist?")) {
      await deletePlaylist(selectedPlaylistId);
      setSelectedPlaylistId(null);
    }
  };

  const handleRemoveTrack = async (songId: string) => {
    if (!selectedPlaylistId) return;
    await removeSongFromPlaylist(selectedPlaylistId, songId);
    // Refresh current view
    try {
      const updated = await playlistService.getPlaylist(selectedPlaylistId);
      setActivePlaylistData(updated);
    } catch {
      // ignore
    }
  };

  // 1. PLAYLIST DETAIL VIEW
  if (selectedPlaylistId) {
    const handleBack = () => {
      triggerHaptic("light");
      closeWithHistory(() => setSelectedPlaylistId(null));
    };

    return (
      <div className="space-y-6 pb-12">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Playlists</span>
        </button>

        {loadingPlaylist ? (
          <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
            Loading playlist tracks...
          </div>
        ) : loadedPlaylistId === selectedPlaylistId && activePlaylistData ? (
          <>
            {/* Playlist Header Banner */}
            <div className="p-5 sm:p-8 rounded-2xl bg-[#0d1015] border border-[#232b35] flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 shadow-md text-[#f5f7fa]">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-[#141922] border border-[#232b35] flex items-center justify-center text-blue-400 shrink-0 overflow-hidden shadow-md">
                {activePlaylistData.coverUrl ? (
                  <Image
                    src={activePlaylistData.coverUrl}
                    alt={activePlaylistData.name}
                    width={144}
                    height={144}
                    unoptimized
                    className="object-cover w-full h-full"
                  />
                ) : playlistSongs[0]?.coverUrl ? (
                  <Image
                    src={playlistSongs[0].coverUrl}
                    alt={activePlaylistData.name}
                    width={144}
                    height={144}
                    unoptimized
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <Library className="w-12 h-12 text-blue-400" />
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                  Playlist
                </span>
                <h1 className="text-xl sm:text-3xl font-extrabold text-white truncate">
                  {activePlaylistData.name}
                </h1>
                {activePlaylistData.description && (
                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">
                    {activePlaylistData.description}
                  </p>
                )}
                <p className="text-xs text-slate-400 font-medium">
                  {playlistSongs.length}{" "}
                  {playlistSongs.length === 1 ? "track" : "tracks"} •{" "}
                  {formatDuration(totalDuration)} total length
                </p>

                <div className="pt-2 flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                  {playlistSongs.length > 0 && (
                    <>
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
                    </>
                  )}

                  <button
                    onClick={handleDelete}
                    className="ml-auto flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                    title="Delete playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tracks List */}
            {playlistSongs.length === 0 ? (
              <div className="text-center py-14 space-y-3 bg-[#0d1015] rounded-2xl border border-[#232b35] p-6 sm:p-8 shadow-xs">
                <Music2 className="w-10 h-10 text-slate-500 mx-auto stroke-[1.5]" />
                <h2 className="text-base font-bold text-white">
                  This playlist is empty
                </h2>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Browse your songs and click the &quot;+&quot; icon or menu on any track to add it here.
                </p>
                <button
                  onClick={() => setActiveTab("songs")}
                  className="min-h-10 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-full transition-all shadow-xs"
                >
                  Find Songs
                </button>
              </div>
            ) : (
              <div className="bg-[#0d1015] p-2 rounded-2xl border border-[#232b35] shadow-xs space-y-1">
                {playlistSongs.map((song, idx) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={idx}
                    allSongs={playlistSongs}
                    onRemoveFromPlaylist={() => handleRemoveTrack(song.id)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-rose-600">Playlist not found.</p>
        )}
      </div>
    );
  }

  // 2. PLAYLISTS OVERVIEW GRID
  return (
    <div className="space-y-6 pb-12 text-[#f5f7fa]">
      <div className="flex items-center justify-between border-b border-[#232b35] pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Your Playlists
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            Organize your music into custom listening vibes
          </p>
        </div>

        <button
          onClick={() => setIsPlaylistModalOpen(true)}
          className="flex min-h-10 sm:min-h-11 items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full transition-all shadow-sm shadow-blue-500/25 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Playlist</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Create Card */}
        <div
          onClick={() => setIsPlaylistModalOpen(true)}
          className="aspect-square rounded-2xl border-2 border-dashed border-[#232b35] hover:border-blue-500/60 bg-[#0d1015] hover:bg-[#131822] cursor-pointer flex flex-col items-center justify-center gap-2 p-4 text-center transition-all group shadow-xs active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-xl bg-[#141922] group-hover:bg-blue-600/20 text-slate-400 group-hover:text-blue-400 flex items-center justify-center transition-colors border border-[#232b35]">
            <FolderPlus className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-300 group-hover:text-blue-400">
            Create Playlist
          </p>
        </div>

        {/* Existing Playlists */}
        {playlists.map((pl) => (
          <div
            key={pl.id}
            onClick={() => {
              triggerHaptic("light");
              setSelectedPlaylistId(pl.id);
            }}
            className="group p-3 sm:p-3.5 rounded-2xl bg-[#0d1015] hover:bg-[#141922] border border-[#232b35] hover:border-blue-500/40 transition-all cursor-pointer flex flex-col gap-2.5 sm:gap-3 shadow-xs hover:shadow-md active:scale-[0.98]"
          >
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#141922] flex items-center justify-center border border-[#232b35]">
              {pl.coverUrl ? (
                <Image
                  src={pl.coverUrl}
                  alt={pl.name}
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <Library className="w-10 h-10 text-slate-500 group-hover:text-blue-400 transition-colors" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                {pl.name}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {pl._count?.songs ?? 0} tracks
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
