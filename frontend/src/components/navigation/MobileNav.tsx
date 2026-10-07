"use client";

import React from "react";
import { Home, Music2, Heart, Library } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";

export default function MobileNav() {
  const { activeTab, setActiveTab, setSelectedPlaylistId, favorites, songs } =
    useLibrary();

  interface MobileNavItem {
    id: "home" | "songs" | "favorites" | "playlists";
    label: string;
    icon: typeof Home;
    count?: number;
  }

  const items: MobileNavItem[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "songs", label: "Songs", icon: Music2, count: songs.length },
    { id: "favorites", label: "Liked", icon: Heart, count: favorites.length },
    { id: "playlists", label: "Playlists", icon: Library },
  ];

  return (
    <nav className="md:hidden h-16 bg-white border-t border-slate-200 px-4 flex items-center justify-around sticky bottom-0 z-50 shadow-md">
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
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all ${
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
            <span className="text-[10px] tracking-tight">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
