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
    return (
      <div className="space-y-6 pb-12">
        <button
          onClick={() => setSelectedPlaylistId(null)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
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
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-xs">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 overflow-hidden shadow-xs">
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
                  <Library className="w-12 h-12 text-blue-600" />
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  Playlist
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {activePlaylistData.name}
                </h1>
                {activePlaylistData.description && (
                  <p className="text-xs sm:text-sm text-slate-600">
                    {activePlaylistData.description}
                  </p>
                )}
                <p className="text-xs text-slate-500 font-medium">
                  {playlistSongs.length}{" "}
                  {playlistSongs.length === 1 ? "track" : "tracks"} •{" "}
                  {formatDuration(totalDuration)} total length
                </p>

                <div className="pt-3 flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                  {playlistSongs.length > 0 && (
                    <>
                      <button
                        onClick={handlePlayAll}
                        className="flex min-h-11 items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full transition-all shadow-sm shadow-blue-500/25 active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play All</span>
                      </button>
                      <button
                        onClick={handleShufflePlay}
                        className="flex min-h-11 items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-full transition-all shadow-xs"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>Shuffle</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleDelete}
                    className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    title="Delete playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tracks List */}
            {playlistSongs.length === 0 ? (
              <div className="text-center py-16 space-y-3 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
                <Music2 className="w-10 h-10 text-slate-400 mx-auto stroke-[1.5]" />
                <h2 className="text-base font-bold text-slate-900">
                  This playlist is empty
                </h2>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Browse your songs and click the &quot;+&quot; icon on any track to add it here.
                </p>
                <button
                  onClick={() => setActiveTab("songs")}
                  className="min-h-11 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white rounded-full transition-all shadow-xs"
                >
                  Find Songs
                </button>
              </div>
            ) : (
              <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs space-y-1">
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
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Your Playlists
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Organize your music into custom listening vibes
          </p>
        </div>

        <button
          onClick={() => setIsPlaylistModalOpen(true)}
          className="flex min-h-11 items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full transition-all shadow-sm shadow-blue-500/25"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Playlist</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Create Card */}
        <div
          onClick={() => setIsPlaylistModalOpen(true)}
          className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-600 bg-white hover:bg-blue-50/40 cursor-pointer flex flex-col items-center justify-center gap-2 p-4 text-center transition-all group shadow-xs"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center transition-colors">
            <FolderPlus className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-700 group-hover:text-blue-600">
            Create Playlist
          </p>
        </div>

        {/* Existing Playlists */}
        {playlists.map((pl) => (
          <div
            key={pl.id}
            onClick={() => setSelectedPlaylistId(pl.id)}
            className="group p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer flex flex-col gap-3 shadow-xs hover:shadow-md"
          >
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
              {pl.coverUrl ? (
                <Image
                  src={pl.coverUrl}
                  alt={pl.name}
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <Library className="w-10 h-10 text-slate-400 group-hover:text-blue-600 transition-colors" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                {pl.name}
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                {pl._count?.songs ?? 0} tracks
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
