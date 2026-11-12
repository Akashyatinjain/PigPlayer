"use client";

import React from "react";
import Image from "next/image";
import { Search, Plus, ListMusic, Keyboard, X, WifiOff, HardDriveDownload } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { useAuthStore } from "@/stores/auth-store";
import { closeWithHistory } from "@/hooks/useMobileNavigation";
import { triggerHaptic } from "@/lib/haptics";
import { offlineStorageService } from "@/services/offline-storage.service";
import { Song } from "@/types/music";

export default function TopBar() {
  const {
    searchQuery,
    setSearchQuery,
    activeTab,
    isOnline,
    setIsUploadOpen,
    setIsShortcutsOpen,
    setActiveTab,
    refreshOfflineSongs,
  } = useLibrary();

  const { queue, toggleQueueOpen, isQueueOpen, playSong } = usePlayerStore();
  const { user, isAuthenticated, logout, initAuth } = useAuthStore();
  const topBarFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleTopBarLocalFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const audioFiles = Array.from(files).filter((file) =>
      file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac|aac|wma|opus)$/i.test(file.name)
    );
    if (audioFiles.length === 0) return;

    triggerHaptic("medium");
    try {
      const imported: Song[] = [];
      for (const f of audioFiles) {
        const s = await offlineStorageService.importLocalFile(f);
        if (s) imported.push(s);
      }
      await refreshOfflineSongs();
      if (imported.length > 0) {
        playSong(imported[0], imported);
        triggerHaptic("success");
      }
    } catch (err) {
      console.error("Local play error:", err);
    }
  };

  React.useEffect(() => {
    initAuth();
  }, [initAuth]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (window.location.pathname === "/") setActiveTab("songs");
  };

  const handleMobileSearchToggle = () => {
    triggerHaptic("light");
    if (activeTab === "songs") {
      closeWithHistory(() => setActiveTab("home"));
    } else {
      setActiveTab("songs");
    }
  };

  return (
    <header className="mobile-header-safe h-14 sm:h-16 shrink-0 px-3 sm:px-4 md:px-8 border-b border-white/[0.06] bg-[#07090D]/90 glass-nav backdrop-blur-md flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30">
      <div className="flex w-full items-center justify-between gap-2 sm:hidden">
        {activeTab === "songs" ? (
          <div className="flex items-center gap-2 w-full">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
              <input
                autoFocus
                type="search"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search songs, artists, albums..."
                aria-label="Search songs, artists, and albums"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.06] py-2 pl-9 pr-8 text-sm text-white placeholder-[#94A3B8] outline-none focus:border-[#FF4D80] transition-all duration-150"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleMobileSearchToggle}
              aria-label="Close search"
              className="flex h-10 px-3 items-center justify-center rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-white hover:bg-white/[0.06] shrink-0 active:scale-[0.97] transition-all duration-150"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-white shrink-0">
              <Image src="/piggy-logo.jpg" alt="piGGyPlayer" width={28} height={28} className="w-7 h-7 rounded-lg object-cover" />
              <span className="text-sm font-bold tracking-wide">pi<span className="text-[#FF4D80]">GG</span>yPlayer</span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleMobileSearchToggle}
                aria-label="Search music"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#94A3B8] hover:bg-white/[0.06] hover:text-white active:scale-[0.97] transition-all duration-150"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => { triggerHaptic("light"); setIsUploadOpen(true); }}
                aria-label="Add songs"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF4D80] text-white hover:bg-[#FF6694] shadow-lg shadow-[#FF4D80]/20 active:scale-[0.97] transition-all duration-150"
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => { triggerHaptic("light"); toggleQueueOpen(); }}
                aria-label="Open queue"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#94A3B8] hover:bg-white/[0.06] hover:text-white active:scale-[0.97] transition-all duration-150"
              >
                <ListMusic className="h-5 w-5" />
                {queue.length > 0 && (
                  <span className="absolute right-1 top-1 h-4 min-w-4 rounded-full bg-[#FF4D80] px-1 text-[9px] font-bold leading-4 text-white">
                    {queue.length > 99 ? "99+" : queue.length}
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Hidden local file input */}
      <input
        ref={topBarFileInputRef}
        type="file"
        multiple
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.opus"
        onChange={(e) => {
          handleTopBarLocalFiles(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />
      {/* Search Bar */}
      <div className="relative hidden flex-1 max-w-md sm:block">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            handleSearch(e.target.value);
          }}
          placeholder="Search your music..."
          className="w-full bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.14] focus:border-[#FF4D80] focus:bg-white/[0.08] text-sm text-white placeholder-[#94A3B8] pl-10 pr-9 py-2 rounded-full outline-none transition-all duration-150"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white transition-colors"
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

        {/* Play Local Song Button (Desktop/Tablet) */}
        <button
          type="button"
          onClick={() => topBarFileInputRef.current?.click()}
          className="flex shrink-0 items-center gap-1.5 px-3 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 active:scale-[0.97] font-semibold text-xs sm:text-sm rounded-full transition-all duration-150"
          title="Play songs directly from your device without uploading"
        >
          <HardDriveDownload className="w-4 h-4 stroke-[2.2]" />
          <span className="hidden md:inline">Play Local</span>
        </button>

        {/* Upload Song Button */}
        <button
          onClick={() => setIsUploadOpen(true)}
          aria-label="Upload music"
          className="flex shrink-0 items-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2 bg-[#FF4D80] hover:bg-[#FF6694] active:scale-[0.97] text-white font-semibold text-xs sm:text-sm rounded-full transition-all duration-150 shadow-lg shadow-[#FF4D80]/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        {/* Queue Drawer Button */}
        <button
          onClick={toggleQueueOpen}
          className={`relative min-h-10 min-w-10 flex items-center justify-center rounded-full border transition-all duration-150 ${
            isQueueOpen
              ? "bg-[#FF4D80]/20 border-[#FF4D80] text-[#FF4D80]"
              : "bg-white/[0.06] border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/[0.14]"
          }`}
          title="Play Queue"
        >
          <ListMusic className="w-4 h-4" />
          {queue.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF4D80] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
              {queue.length > 99 ? "99+" : queue.length}
            </span>
          )}
        </button>

        {/* Shortcuts Button */}
        <button
          onClick={() => setIsShortcutsOpen(true)}
          className="hidden sm:flex p-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/[0.14] transition-all duration-150"
          title="Keyboard Shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* User Auth Profile / Login */}
        <div className="flex items-center ml-1">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full bg-[#FF4D80] text-white font-semibold text-xs flex items-center justify-center border border-[#FF4D80]/40"
                title={`${user.name} (${user.email})`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={() => logout()}
                className="hidden md:inline-block text-xs font-medium text-[#94A3B8] hover:text-rose-400 transition-colors"
                title="Log out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="text-xs font-semibold text-[#94A3B8] hover:text-white px-3 py-1.5 rounded-full border border-white/[0.08] hover:border-white/[0.14] bg-white/[0.06] transition-all duration-150"
            >
              Sign In
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
