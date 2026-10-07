"use client";

import React from "react";
import { Search, Plus, ListMusic, Keyboard, X } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { useAuthStore } from "@/stores/auth-store";

export default function TopBar() {
  const {
    searchQuery,
    setSearchQuery,
    setIsUploadOpen,
    setIsShortcutsOpen,
    setActiveTab,
  } = useLibrary();

  const { queue, toggleQueueOpen, isQueueOpen } = usePlayerStore();
  const { user, isAuthenticated, logout, initAuth } = useAuthStore();

  React.useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <header className="h-16 px-4 md:px-8 border-b border-slate-200 bg-white/95 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value && window.location.pathname === "/") {
              setActiveTab("songs");
            }
          }}
          placeholder="Search songs, artists, albums..."
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
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Upload Song Button */}
        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-full transition-all duration-150 shadow-sm shadow-blue-500/25"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Upload</span>
        </button>

        {/* Queue Drawer Button */}
        <button
          onClick={toggleQueueOpen}
          className={`relative p-2 sm:p-2.5 rounded-full border transition-all duration-150 ${
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
