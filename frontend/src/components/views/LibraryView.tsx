"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Library, ListMusic, Music2, Plus } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import SongRow from "@/components/music/SongRow";
import OfflineView from "@/components/views/OfflineView";

type Section = "all" | "favorites" | "playlists" | "history" | "offline";

export default function LibraryView() {
  const {
    songs,
    favorites,
    playlists,
    history,
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
    { id: "offline", label: "Offline Vault" },
  ];
  const filteredSongs = searchQuery.trim()
    ? songs.filter((song) =>
        `${song.title} ${song.artist} ${song.album || ""} ${song.genre || ""}`
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase()),
      )
    : songs;

  return (
    <div className="space-y-5 pb-8 text-[#f5f7fa]">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Your collection</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Library</h1>
        </div>
        <button
          type="button"
          onClick={() => setIsPlaylistModalOpen(true)}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-[#232b35] bg-[#141922] px-3.5 text-sm font-medium text-slate-300 transition-colors hover:bg-[#1c232f] hover:text-white"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New playlist</span>
          <span className="sm:hidden">Create</span>
        </button>
      </div>

      <div role="tablist" aria-label="Library sections" className="flex w-full gap-1 overflow-x-auto border-b border-[#232b35]">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={section === item.id}
            onClick={() => setSection(item.id)}
            className={`min-h-11 shrink-0 border-b-2 px-3.5 text-sm transition-colors ${section === item.id ? "border-blue-500 font-semibold text-white" : "border-transparent text-slate-400 hover:text-white"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div aria-label="Loading your library" className="space-y-3">
          <div className="h-20 animate-pulse rounded-2xl bg-[#12161d]" />
          <div className="h-20 animate-pulse rounded-2xl bg-[#12161d]" />
          <div className="h-20 animate-pulse rounded-2xl bg-[#12161d]" />
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
      {section === "offline" && <OfflineView />}
      {section === "playlists" && (
        playlists.length ? (
          <div className="divide-y divide-[#1f2631] overflow-hidden rounded-2xl border border-[#232b35] bg-[#0d1015]">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() => {
                  setSelectedPlaylistId(playlist.id);
                  setActiveTab("playlists");
                }}
                className="flex min-h-[4.5rem] w-full items-center gap-3 px-3 text-left transition-colors hover:bg-[#141922]"
              >
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#141922] text-slate-400">
                  {playlist.coverUrl ? <Image src={playlist.coverUrl} alt="" fill unoptimized className="object-cover" /> : <ListMusic className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">{playlist.name}</span>
                  <span className="block text-xs text-slate-400">{playlist._count?.songs ?? 0} songs</span>
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
        <button type="button" onClick={() => setIsPlaylistModalOpen(true)} className="-mt-2 min-h-11 rounded-xl px-3 text-sm font-semibold text-blue-400 hover:bg-blue-600/10">
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
    <div className="divide-y divide-[#1f2631] overflow-hidden rounded-2xl border border-[#232b35] bg-[#0d1015]">
      {songs.map((song, index) => <SongRow key={`${song.id}-${index}`} song={song} index={index} allSongs={songs} />)}
    </div>
  );
}

function EmptyCollection({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[#232b35] bg-[#0d1015] px-6 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#141922] text-blue-400">{icon}</span>
      <h2 className="mt-4 text-base font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-1 max-w-xs text-sm text-slate-400">{description}</p>
    </div>
  );
}
