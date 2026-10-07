"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Library, ListMusic, Music2, Plus } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import SongRow from "@/components/music/SongRow";

type Section = "all" | "favorites" | "playlists" | "history" | "offline";

export default function LibraryView() {
  const {
    songs,
    favorites,
    playlists,
    history,
    offlineSongs,
    isLoading,
    searchQuery,
    setSelectedPlaylistId,
    setActiveTab,
    setIsPlaylistModalOpen,
  } = useLibrary();
  const [section, setSection] = useState<Section>("all");
  const sections: Array<{ id: Section; label: string }> = [
    { id: "all", label: "All" },
    { id: "favorites", label: "Favorites" },
    { id: "playlists", label: "Playlists" },
    { id: "history", label: "History" },
    { id: "offline", label: "Offline" },
  ];
  const filteredSongs = searchQuery.trim()
    ? songs.filter((song) =>
        `${song.title} ${song.artist} ${song.album || ""}`
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase()),
      )
    : songs;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Your collection</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Library</h1>
        </div>
        <button
          type="button"
          onClick={() => setIsPlaylistModalOpen(true)}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New playlist</span>
          <span className="sm:hidden">Create</span>
        </button>
      </div>

      <div role="tablist" aria-label="Library sections" className="flex w-full gap-1 overflow-x-auto border-b border-slate-200">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={section === item.id}
            onClick={() => setSection(item.id)}
            className={`min-h-11 shrink-0 border-b-2 px-3 text-sm transition-colors ${section === item.id ? "border-blue-500 font-semibold text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div aria-label="Loading your library" className="space-y-3">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : <>
      {section === "all" && (
        <SongCollection songs={filteredSongs} emptyTitle="Your library is quiet" emptyText="Add a few songs and your collection will show up here." />
      )}
      {section === "favorites" && (
        <SongCollection songs={favorites} emptyTitle="No liked songs yet" emptyText="Tap the heart on a song to keep it close." />
      )}
      {section === "history" && (
        <SongCollection songs={history.map((item) => item.song)} emptyTitle="Nothing played yet" emptyText="Your recent listening will appear here." />
      )}
      {section === "offline" && (
        <SongCollection songs={offlineSongs} emptyTitle="No offline music yet" emptyText="Save songs for offline listening from their action menu." />
      )}
      {section === "playlists" && (
        playlists.length ? (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() => {
                  setSelectedPlaylistId(playlist.id);
                  setActiveTab("playlists");
                }}
                className="flex min-h-[4.5rem] w-full items-center gap-3 px-3 text-left transition-colors hover:bg-slate-50"
              >
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-500">
                  {playlist.coverUrl ? <Image src={playlist.coverUrl} alt="" fill unoptimized className="object-cover" /> : <ListMusic className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">{playlist.name}</span>
                  <span className="block text-xs text-slate-500">{playlist._count?.songs ?? 0} songs</span>
                </span>
                <Library className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        ) : (
          <EmptyCollection icon={<Library className="h-6 w-6" />} title="No playlists yet" description="Make a playlist for any mood or moment." />
        )
      )}
      {section === "playlists" && playlists.length === 0 && (
        <button type="button" onClick={() => setIsPlaylistModalOpen(true)} className="-mt-2 min-h-11 rounded-xl px-3 text-sm font-semibold text-blue-500 hover:bg-blue-50">
          Create playlist
        </button>
      )}
      </>}
    </div>
  );
}

function SongCollection({ songs, emptyTitle, emptyText }: { songs: import("@/types/music").Song[]; emptyTitle: string; emptyText: string }) {
  if (songs.length === 0) return <EmptyCollection icon={<Music2 className="h-6 w-6" />} title={emptyTitle} description={emptyText} />;
  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {songs.map((song, index) => <SongRow key={`${song.id}-${index}`} song={song} index={index} allSongs={songs} />)}
    </div>
  );
}

function EmptyCollection({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">{icon}</span>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">{description}</p>
    </div>
  );
}
