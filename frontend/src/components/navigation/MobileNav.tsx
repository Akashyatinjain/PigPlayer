"use client";

import React from "react";
import { Home, Music2, Heart, Library, Settings } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";

export default function MobileNav() {
  const { activeTab, setActiveTab, setSelectedPlaylistId, favorites, songs } =
    useLibrary();

  interface MobileNavItem {
    id: "home" | "songs" | "favorites" | "playlists" | "settings";
    label: string;
    icon: typeof Home;
    count?: number;
  }

  const items: MobileNavItem[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "songs", label: "Songs", icon: Music2, count: songs.length },
    { id: "favorites", label: "Liked", icon: Heart, count: favorites.length },
    { id: "playlists", label: "Playlists", icon: Library },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav aria-label="Main navigation" className="md:hidden shrink-0 bg-white/95 backdrop-blur border-t border-slate-200 px-2 pt-1 flex items-center justify-around z-50 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] mobile-safe-bottom">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              if (item.id !== "playlists") {
                setSelectedPlaylistId(null);
              }
            }}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 flex-1 rounded-xl transition-all active:scale-95 ${
              isActive ? "text-blue-600 font-semibold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.count !== undefined && item.count > 0 && (
                <span className="absolute -top-1 -right-2 px-1 text-[9px] bg-blue-100 border border-blue-200 text-blue-700 rounded-full font-bold">
                  {item.count}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-none tracking-tight">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
