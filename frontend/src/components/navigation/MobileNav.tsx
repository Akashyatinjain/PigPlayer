"use client";

import React from "react";
import { Home, Search, Library, UserRound } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";

export default function MobileNav() {
  const { activeTab, setActiveTab, setSelectedPlaylistId } = useLibrary();
  const items = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "songs" as const, label: "Search", icon: Search },
    { id: "library" as const, label: "Library", icon: Library },
    { id: "settings" as const, label: "Profile", icon: UserRound },
  ];

  return (
    <nav aria-label="Main navigation" className="mobile-nav lg:hidden shrink-0 px-3 pt-1 flex items-center justify-around z-40 mobile-safe-bottom">
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = id === "library"
          ? ["library", "favorites", "playlists", "history", "offline"].includes(activeTab)
          : activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              setActiveTab(id);
              setSelectedPlaylistId(null);
            }}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-colors active:scale-95 ${isActive ? "text-blue-400" : "text-slate-400 hover:text-slate-100"}`}
          >
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="text-[10px] leading-none tracking-tight">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
