"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight, Disc3, Music2, Pause, Play, Plus } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import SongRow from "@/components/music/SongRow";

export default function HomeView() {
  const {
    songs,
    favorites,
    history,
    playlists,
    isLoading,
    setActiveTab,
    setSelectedPlaylistId,
    setIsUploadOpen,
  } = useLibrary();
  const { currentSong, isPlaying, playSong, togglePlayPause } = usePlayerStore();
  const featuredSong = currentSong || songs[0];

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8 sm:space-y-10">
      <div className="flex items-end justify-between gap-4 pt-1">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Your space, your sound</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Good evening</h1>
        </div>
        <button type="button" onClick={() => setIsUploadOpen(true)} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add music</span>
        </button>
      </div>

      {isLoading && (
        <div aria-label="Loading your music" className="space-y-3">
          <div className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 sm:h-52" />
          <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
          <div className="grid grid-cols-3 gap-3">
            <div className="aspect-square animate-pulse rounded-xl bg-slate-100" />
            <div className="aspect-square animate-pulse rounded-xl bg-slate-100" />
            <div className="aspect-square animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      )}

      {!isLoading && featuredSong ? (
        <section className="relative isolate overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="absolute inset-0 -z-10 opacity-[0.08] blur-3xl" style={{ backgroundImage: featuredSong.coverUrl ? `url("${featuredSong.coverUrl}")` : undefined, backgroundPosition: "center", backgroundSize: "cover" }} />
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-32 sm:w-32">
              {featuredSong.coverUrl ? <Image src={featuredSong.coverUrl} alt={featuredSong.title} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-slate-500"><Music2 className="h-8 w-8" /></div>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-500"><Disc3 className="h-3.5 w-3.5" />{currentSong ? "Now playing" : "Picked for you"}</p>
              <h2 className="mt-2 line-clamp-2 text-lg font-semibold tracking-tight text-slate-900 sm:text-2xl">{featuredSong.title}</h2>
              <p className="mt-1 truncate text-sm text-slate-500">{featuredSong.artist}</p>
              <button type="button" onClick={() => currentSong?.id === featuredSong.id ? togglePlayPause() : playSong(featuredSong, songs)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:scale-[0.98]">
                {currentSong?.id === featuredSong.id && isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}{currentSong?.id === featuredSong.id && isPlaying ? "Pause" : "Play now"}
              </button>
            </div>
          </div>
        </section>
      ) : !isLoading ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center sm:py-14">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-blue-500"><Music2 className="h-7 w-7" /></span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Your library is quiet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Bring your music in and make this space yours.</p>
          <button type="button" onClick={() => setIsUploadOpen(true)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" />Add songs</button>
        </section>
      ) : null}

      {history.length > 0 && (
        <SongRail title="Recently played" action="See history" onAction={() => setActiveTab("history")} songs={history.slice(0, 10).map((item) => item.song)} allSongs={songs} playSong={playSong} />
      )}
      {favorites.length > 0 && (
        <SongRail title="Your favorites" action="See all" onAction={() => setActiveTab("favorites")} songs={favorites.slice(0, 10)} allSongs={favorites} playSong={playSong} />
      )}

      {playlists.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Made by you</h2>
            <button type="button" onClick={() => { setSelectedPlaylistId(null); setActiveTab("playlists"); }} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-slate-500 hover:text-blue-500">Playlists <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="horizontal-rail">
            {playlists.map((playlist) => (
              <button key={playlist.id} type="button" onClick={() => { setSelectedPlaylistId(playlist.id); setActiveTab("playlists"); }} className="group w-36 shrink-0 snap-start text-left sm:w-44">
                <span className="relative block aspect-square overflow-hidden rounded-xl bg-slate-100">
                  {playlist.coverUrl ? <Image src={playlist.coverUrl} alt="" fill unoptimized className="object-cover transition-transform duration-200 group-hover:scale-[1.03]" /> : <span className="flex h-full items-center justify-center text-slate-500"><Disc3 className="h-8 w-8" /></span>}
                </span>
                <span className="mt-2 block truncate text-sm font-medium text-slate-900">{playlist.name}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{playlist._count?.songs ?? 0} songs</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {songs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">All songs</h2>
            <button type="button" onClick={() => setActiveTab("songs")} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-slate-500 hover:text-blue-500">Browse all <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {songs.slice(0, 5).map((song, index) => <SongRow key={song.id} song={song} index={index} allSongs={songs} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function SongRail({ title, action, onAction, songs, allSongs, playSong }: {
  title: string;
  action: string;
  onAction: () => void;
  songs: import("@/types/music").Song[];
  allSongs: import("@/types/music").Song[];
  playSong: (song: import("@/types/music").Song, queue?: import("@/types/music").Song[]) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        <button type="button" onClick={onAction} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-slate-500 hover:text-blue-500">{action}<ArrowRight className="h-4 w-4" /></button>
      </div>
      <div className="horizontal-rail">
        {songs.map((song) => (
          <button key={song.id} type="button" onClick={() => playSong(song, allSongs)} className="group w-36 shrink-0 snap-start text-left sm:w-44">
            <span className="relative block aspect-square overflow-hidden rounded-xl bg-slate-100">
              {song.coverUrl ? <Image src={song.coverUrl} alt={song.title} fill unoptimized className="object-cover transition-transform duration-200 group-hover:scale-[1.03]" /> : <span className="flex h-full items-center justify-center text-slate-500"><Music2 className="h-8 w-8" /></span>}
            </span>
            <span className="mt-2 block truncate text-sm font-medium text-slate-900">{song.title}</span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">{song.artist}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
