"use client";

import React from "react";
import {
  Home,
  Music2,
  Heart,
  Library,
  History,
  Plus,
  Disc3,
  Settings,
  HardDriveDownload,
} from "lucide-react";
import { useLibrary, LibraryTab } from "@/context/LibraryContext";

export default function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    playlists,
    selectedPlaylistId,
    setSelectedPlaylistId,
    setIsPlaylistModalOpen,
    favorites,
    songs,
    offlineSongs,
  } = useLibrary();

  interface NavItem {
    id: LibraryTab;
    label: string;
    icon: typeof Home;
    badge?: number;
  }

  const navItems: NavItem[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "songs", label: "All Songs", icon: Music2, badge: songs.length },
    { id: "offline", label: "Offline Vault", icon: HardDriveDownload, badge: offlineSongs.length },
    { id: "favorites", label: "Favorites", icon: Heart, badge: favorites.length },
    { id: "playlists", label: "Playlists", icon: Library, badge: playlists.length },
    { id: "history", label: "History", icon: History },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-56 bg-[#0c0f14] border-r border-[#1f2631] h-full flex flex-col justify-between shrink-0 select-none text-[#f5f7fa]">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Brand Header */}
        <div className="p-6 pb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shadow-md shadow-blue-500/10">
            <Disc3 className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wider text-white">
              SOUNDIFY
            </h1>
            <p className="text-[11px] text-slate-400 font-medium tracking-tight">
              Personal Hi-Fi Player
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id && (!selectedPlaylistId || item.id !== "playlists");
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id !== "playlists") {
                    setSelectedPlaylistId(null);
                  }
                }}
                className={`w-full min-h-11 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30 shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-[#161c24]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-blue-400" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-medium ${
                      isActive
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-[#18202b] text-slate-400 border border-[#232d3d]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Playlists Section */}
        <div className="mt-6 px-4 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              Playlists
            </span>
            <button
              onClick={() => setIsPlaylistModalOpen(true)}
              aria-label="Create playlist"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-[#161c24] transition-colors"
              title="Create new playlist"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {playlists.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No playlists yet
              </p>
            ) : (
              playlists.map((playlist) => {
                const isSelected =
                  activeTab === "playlists" &&
                  selectedPlaylistId === playlist.id;
                return (
                  <button
                    key={playlist.id}
                    onClick={() => {
                      setActiveTab("playlists");
                      setSelectedPlaylistId(playlist.id);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs truncate transition-all ${
                      isSelected
                        ? "bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30"
                        : "text-slate-400 hover:text-white hover:bg-[#161c24]"
                    }`}
                  >
                    {playlist.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#1f2631] text-[11px] text-slate-500 flex items-center justify-between">
        <span>Soundify</span>
        <span className="font-mono text-[10px]">v1.0.0</span>
      </div>
    </aside>
  );
}
