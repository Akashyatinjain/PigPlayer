"use client";

import React from "react";
import Image from "next/image";
import {
  Home,
  Music2,
  Heart,
  Library,
  History,
  Plus,
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
    { id: "offline", label: "Local Storage", icon: HardDriveDownload, badge: offlineSongs.length },
    { id: "favorites", label: "Favorites", icon: Heart, badge: favorites.length },
    { id: "playlists", label: "Playlists", icon: Library, badge: playlists.length },
    { id: "history", label: "History", icon: History },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside suppressHydrationWarning className="w-56 bg-[#07090D] border-r border-white/[0.06] h-full flex flex-col justify-between shrink-0 select-none text-[#F8FAFC]">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Brand Header */}
        <div className="p-6 pb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-[#FF4D80]/15 border border-[#FF4D80]/25 shrink-0">
            <Image src="/piggy-logo.jpg" alt="piGGyPlayer" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wider text-white">
              pi<span className="text-[#FF4D80]">GG</span>yPlayer
            </h1>
            <p className="text-[11px] text-[#64748B] font-medium tracking-tight">
              Oink your tunes 🐷
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
                type="button"
                suppressHydrationWarning
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id !== "playlists") {
                    setSelectedPlaylistId(null);
                  }
                }}
                className={`w-full min-h-11 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[#FF4D80]/10 text-[#FF4D80] font-semibold border-l-2 border-[#FF4D80] shadow-xs"
                    : "text-[#94A3B8] hover:text-white hover:bg-white/[0.06] active:scale-[0.97]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-[#FF4D80]" : "text-[#94A3B8]"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-medium ${
                      isActive
                        ? "bg-[#FF4D80]/20 text-[#FF4D80]"
                        : "bg-white/[0.06] text-[#94A3B8] border border-white/[0.08]"
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
          <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/[0.06]">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#64748B]">
              Playlists
            </span>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setIsPlaylistModalOpen(true)}
              aria-label="Create playlist"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition-all duration-150 active:scale-[0.97]"
              title="Create new playlist"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {playlists.length === 0 ? (
              <p className="text-xs text-[#64748B] italic py-2">
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
                    type="button"
                    suppressHydrationWarning
                    onClick={() => {
                      setActiveTab("playlists");
                      setSelectedPlaylistId(playlist.id);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs truncate transition-all duration-150 ${
                      isSelected
                        ? "bg-[#FF4D80]/10 text-[#FF4D80] font-semibold border-l-2 border-[#FF4D80]"
                        : "text-[#94A3B8] hover:text-white hover:bg-white/[0.06] active:scale-[0.97]"
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
      <div className="p-4 border-t border-white/[0.06] text-[11px] text-[#64748B] flex items-center justify-between">
        <span>piGGyPlayer</span>
        <span className="font-mono text-[10px]">v1.0.0</span>
      </div>
    </aside>
  );
}
