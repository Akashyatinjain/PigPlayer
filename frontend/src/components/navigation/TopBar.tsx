"use client";

import React from "react";
import { Search, Plus, ListMusic, Keyboard, X, Disc3, WifiOff } from "lucide-react";
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
    <header className="mobile-header-safe h-14 sm:h-16 shrink-0 px-3 sm:px-4 md:px-8 border-b border-slate-200 bg-white/95 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30">
      <div className="flex w-full items-center justify-between gap-3 sm:hidden">
        {activeTab === "songs" ? (
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              autoFocus
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search songs, artists, albums"
              aria-label="Search songs, artists, and albums"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-base text-slate-900 outline-none focus:border-blue-500"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-900">
            <Disc3 className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-semibold tracking-[0.12em]">SOUNDIFY</span>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setActiveTab(activeTab === "songs" ? "home" : "songs")} aria-label={activeTab === "songs" ? "Close search" : "Search music"} className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100">
            {activeTab === "songs" ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <button type="button" onClick={() => setIsUploadOpen(true)} aria-label="Add songs" className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="h-5 w-5" />
          </button>
          <button type="button" onClick={toggleQueueOpen} aria-label="Open queue" className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100">
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
          className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:bg-white text-sm text-slate-900 placeholder-slate-400 pl-10 pr-9 py-2 rounded-full outline-none transition-all duration-150"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
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
              ? "bg-blue-50 border-blue-600 text-blue-600"
              : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
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
          className="hidden sm:flex p-2.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all"
          title="Keyboard Shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* User Auth Profile / Login */}
        <div className="flex items-center ml-1">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full bg-slate-900 text-white font-semibold text-xs flex items-center justify-center border border-slate-200"
                title={`${user.name} (${user.email})`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={() => logout()}
                className="hidden md:inline-block text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors"
                title="Log out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="text-xs font-semibold text-slate-700 hover:text-blue-600 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-white transition-all"
            >
              Sign In
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
