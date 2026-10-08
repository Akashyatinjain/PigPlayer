"use client";

import React from "react";
import Image from "next/image";
import { Search, Plus, ListMusic, Keyboard, X, WifiOff } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { useAuthStore } from "@/stores/auth-store";

export default function TopBar() {
  const {
    searchQuery,
    setSearchQuery,
    activeTab,
    isOnline,
    setIsUploadOpen,
    setIsShortcutsOpen,
    setActiveTab,
  } = useLibrary();

  const { queue, toggleQueueOpen, isQueueOpen } = usePlayerStore();
  const { user, isAuthenticated, logout, initAuth } = useAuthStore();

  React.useEffect(() => {
    initAuth();
  }, [initAuth]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (window.location.pathname === "/") setActiveTab("songs");
  };

  return (
    <header className="mobile-header-safe h-14 sm:h-16 shrink-0 px-3 sm:px-4 md:px-8 border-b border-[#1f2631] bg-[#0c0f14]/95 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30">
      <div className="flex w-full items-center justify-between gap-3 sm:hidden">
        {activeTab === "songs" ? (
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              autoFocus
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search songs, artists, albums"
              aria-label="Search songs, artists, and albums"
              className="w-full rounded-xl border border-[#232b35] bg-[#141922] py-2.5 pl-10 pr-3 text-base text-white placeholder-slate-400 outline-none focus:border-blue-500"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-white">
            <Image src="/piggy-logo.jpg" alt="piGGyPlayer" width={28} height={28} className="w-7 h-7 rounded-lg object-cover" />
            <span className="text-sm font-bold tracking-wide">pi<span className="text-pink-500">GG</span>yPlayer</span>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setActiveTab(activeTab === "songs" ? "home" : "songs")} aria-label={activeTab === "songs" ? "Close search" : "Search music"} className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-[#161c24] hover:text-white">
            {activeTab === "songs" ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <button type="button" onClick={() => setIsUploadOpen(true)} aria-label="Add songs" className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20">
            <Plus className="h-5 w-5" />
          </button>
          <button type="button" onClick={toggleQueueOpen} aria-label="Open queue" className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-[#161c24] hover:text-white">
            <ListMusic className="h-5 w-5" />
            {queue.length > 0 && <span className="absolute right-1 top-1 h-4 min-w-4 rounded-full bg-blue-500 px-1 text-[9px] font-bold leading-4 text-white">{queue.length > 99 ? "99+" : queue.length}</span>}
          </button>
        </div>
      </div>
      {/* Search Bar */}
      <div className="relative hidden flex-1 max-w-md sm:block">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            handleSearch(e.target.value);
          }}
          placeholder="Search your music..."
          className="w-full bg-[#141922] border border-[#232b35] hover:border-[#2f3947] focus:border-blue-500 focus:bg-[#171d27] text-sm text-white placeholder-slate-400 pl-10 pr-9 py-2 rounded-full outline-none transition-all duration-150"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right Action Buttons */}
      <div className="hidden items-center gap-2 sm:flex sm:gap-3">
        {!isOnline && (
          <button
            type="button"
            onClick={() => setActiveTab("offline")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 transition-colors"
            title="You are currently offline. Click to open Offline Vault."
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline Mode</span>
          </button>
        )}

        {/* Upload Song Button */}
        <button
          onClick={() => setIsUploadOpen(true)}
          aria-label="Upload music"
          className="flex shrink-0 items-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-full transition-all duration-150 shadow-sm shadow-blue-500/25"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        {/* Queue Drawer Button */}
        <button
          onClick={toggleQueueOpen}
          className={`relative min-h-10 min-w-10 flex items-center justify-center rounded-full border transition-all duration-150 ${
            isQueueOpen
              ? "bg-blue-600/20 border-blue-500 text-blue-400"
              : "bg-[#141922] border-[#232b35] text-slate-300 hover:text-white hover:border-[#2f3947]"
          }`}
          title="Play Queue"
        >
          <ListMusic className="w-4 h-4" />
          {queue.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
              {queue.length > 99 ? "99+" : queue.length}
            </span>
          )}
        </button>

        {/* Shortcuts Button */}
        <button
          onClick={() => setIsShortcutsOpen(true)}
          className="hidden sm:flex p-2.5 rounded-full bg-[#141922] border border-[#232b35] text-slate-400 hover:text-white hover:border-[#2f3947] transition-all"
          title="Keyboard Shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* User Auth Profile / Login */}
        <div className="flex items-center ml-1">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center border border-blue-500/40"
                title={`${user.name} (${user.email})`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={() => logout()}
                className="hidden md:inline-block text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors"
                title="Log out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-full border border-[#232b35] hover:border-[#2f3947] bg-[#141922] transition-all"
            >
              Sign In
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
