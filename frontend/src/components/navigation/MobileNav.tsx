"use client";

import React from "react";
import { Home, Search, Library, UserRound } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { triggerHaptic } from "@/lib/haptics";

export default function MobileNav() {
  const { activeTab, setActiveTab, setSelectedPlaylistId } = useLibrary();
  const items = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "songs" as const, label: "Search", icon: Search },
    { id: "library" as const, label: "Library", icon: Library },
    { id: "settings" as const, label: "Profile", icon: UserRound },
  ];

  return (
    <nav suppressHydrationWarning aria-label="Main navigation" className="mobile-nav lg:hidden shrink-0 px-3 pt-1 flex items-center justify-around z-40 mobile-safe-bottom">
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = id === "library"
          ? ["library", "favorites", "playlists", "history", "offline"].includes(activeTab)
          : activeTab === id;
        return (
          <button
            key={id}
            type="button"
            suppressHydrationWarning
            onClick={() => {
              triggerHaptic("light");
              setActiveTab(id);
              setSelectedPlaylistId(null);
            }}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-all duration-150 active:scale-95 ${
              isActive
                ? "text-blue-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className="relative">
              <Icon className="h-5 w-5 transition-transform" strokeWidth={isActive ? 2.4 : 1.8} />
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400 shadow-sm shadow-blue-400" />
              )}
            </div>
            <span className="text-[10px] leading-none tracking-tight">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
