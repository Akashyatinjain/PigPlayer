"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { triggerHaptic } from "@/lib/haptics";

/**
 * Safely closes an overlay, popping the history state if one exists
 * so hardware back and on-screen close buttons remain in perfect sync.
 */
export function closeWithHistory(fallbackAction: () => void) {
  if (typeof window !== "undefined" && window.history.state?.pigOverlay) {
    window.history.back();
  } else {
    fallbackAction();
  }
}

export function useMobileNavigation() {
  const {
    isUploadOpen,
    setIsUploadOpen,
    isPlaylistModalOpen,
    setIsPlaylistModalOpen,
    isAddToPlaylistOpen,
    setIsAddToPlaylistOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    selectedPlaylistId,
    setSelectedPlaylistId,
    activeTab,
    setActiveTab,
  } = useLibrary();

  const {
    isExpandedPlayerOpen,
    setExpandedPlayer,
    isQueueOpen,
    setQueueOpen,
  } = usePlayerStore();

  const [exitToastVisible, setExitToastVisible] = useState(false);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastBackPressTimeRef = useRef<number>(0);
  const isPopstateRef = useRef(false);

  // Active stack tracking
  const activeStackRef = useRef<string[]>([]);

  // Push an overlay to history
  const pushOverlay = useCallback((overlayName: string) => {
    if (typeof window === "undefined") return;
    if (activeStackRef.current[activeStackRef.current.length - 1] === overlayName) return;

    activeStackRef.current.push(overlayName);
    window.history.pushState(
      { pigOverlay: overlayName, depth: activeStackRef.current.length },
      ""
    );
  }, []);

  // Sync state changes with history
  useEffect(() => {
    if (isPopstateRef.current) return;
    if (isExpandedPlayerOpen) pushOverlay("player");
  }, [isExpandedPlayerOpen, pushOverlay]);

  useEffect(() => {
    if (isPopstateRef.current) return;
    if (isQueueOpen) pushOverlay("queue");
  }, [isQueueOpen, pushOverlay]);

  useEffect(() => {
    if (isPopstateRef.current) return;
    if (isUploadOpen) pushOverlay("upload");
  }, [isUploadOpen, pushOverlay]);

  useEffect(() => {
    if (isPopstateRef.current) return;
    if (isPlaylistModalOpen) pushOverlay("playlist-modal");
  }, [isPlaylistModalOpen, pushOverlay]);

  useEffect(() => {
    if (isPopstateRef.current) return;
    if (isAddToPlaylistOpen) pushOverlay("add-to-playlist");
  }, [isAddToPlaylistOpen, pushOverlay]);

  useEffect(() => {
    if (isPopstateRef.current) return;
    if (isShortcutsOpen) pushOverlay("shortcuts");
  }, [isShortcutsOpen, pushOverlay]);

  useEffect(() => {
    if (isPopstateRef.current) return;
    if (selectedPlaylistId) pushOverlay("playlist-detail");
  }, [selectedPlaylistId, pushOverlay]);

  // Main Popstate (Hardware Back / Cut Button) Handler
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Anchor the root state so pressing back on root can be caught
    if (!window.history.state?.pigRoot) {
      window.history.replaceState({ pigRoot: true }, "");
    }

    const handlePopState = () => {
      isPopstateRef.current = true;
      triggerHaptic("light");

      // 1. Fullscreen Player
      if (usePlayerStore.getState().isExpandedPlayerOpen) {
        setExpandedPlayer(false);
        activeStackRef.current = activeStackRef.current.filter((s) => s !== "player");
        setTimeout(() => { isPopstateRef.current = false; }, 50);
        return;
      }

      // 2. Queue Drawer
      if (usePlayerStore.getState().isQueueOpen) {
        setQueueOpen(false);
        activeStackRef.current = activeStackRef.current.filter((s) => s !== "queue");
        setTimeout(() => { isPopstateRef.current = false; }, 50);
        return;
      }

      // 3. Upload Modal
      if (isUploadOpen) {
        setIsUploadOpen(false);
        activeStackRef.current = activeStackRef.current.filter((s) => s !== "upload");
        setTimeout(() => { isPopstateRef.current = false; }, 50);
        return;
      }

      // 4. Playlist Modal
      if (isPlaylistModalOpen) {
        setIsPlaylistModalOpen(false);
        activeStackRef.current = activeStackRef.current.filter((s) => s !== "playlist-modal");
        setTimeout(() => { isPopstateRef.current = false; }, 50);
        return;
      }

      // 5. Add to Playlist Modal
      if (isAddToPlaylistOpen) {
        setIsAddToPlaylistOpen(false);
        activeStackRef.current = activeStackRef.current.filter((s) => s !== "add-to-playlist");
        setTimeout(() => { isPopstateRef.current = false; }, 50);
        return;
      }

      // 6. Shortcuts Modal
      if (isShortcutsOpen) {
        setIsShortcutsOpen(false);
        activeStackRef.current = activeStackRef.current.filter((s) => s !== "shortcuts");
        setTimeout(() => { isPopstateRef.current = false; }, 50);
        return;
      }

      // 7. Playlist Detail View -> Back to Playlists List
      if (selectedPlaylistId) {
        setSelectedPlaylistId(null);
        activeStackRef.current = activeStackRef.current.filter((s) => s !== "playlist-detail");
        setTimeout(() => { isPopstateRef.current = false; }, 50);
        return;
      }

      // 8. Non-Home Tab -> Back to Home Tab
      if (activeTab !== "home") {
        setActiveTab("home");
        setTimeout(() => { isPopstateRef.current = false; }, 50);
        return;
      }

      // 9. Root View: Double-tap back to exit
      const now = Date.now();
      if (now - lastBackPressTimeRef.current < 2500) {
        // Allow actual exit
        window.history.back();
      } else {
        lastBackPressTimeRef.current = now;
        // Re-anchor state so next press is handled
        window.history.pushState({ pigRoot: true }, "");
        setExitToastVisible(true);
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        exitTimerRef.current = setTimeout(() => {
          setExitToastVisible(false);
        }, 2400);
      }

      setTimeout(() => { isPopstateRef.current = false; }, 50);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [
    isUploadOpen,
    setIsUploadOpen,
    isPlaylistModalOpen,
    setIsPlaylistModalOpen,
    isAddToPlaylistOpen,
    setIsAddToPlaylistOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    selectedPlaylistId,
    setSelectedPlaylistId,
    activeTab,
    setActiveTab,
    setExpandedPlayer,
    setQueueOpen,
  ]);

  return { exitToastVisible };
}

/**
 * Visual Toast displayed when user is on Home and presses back
 */
export function MobileExitToast({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-24 inset-x-0 mx-auto w-fit z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-2 bg-[#121620]/95 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-full shadow-2xl text-xs font-semibold text-white tracking-wide">
        <span className="text-base">🐷</span>
        <span>Press back again to exit</span>
      </div>
    </div>
  );
}
