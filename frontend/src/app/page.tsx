"use client";

import React from "react";
import { LibraryProvider, useLibrary } from "@/context/LibraryContext";
import GlobalAudioPlayer from "@/components/player/GlobalAudioPlayer";
import Sidebar from "@/components/navigation/Sidebar";
import TopBar from "@/components/navigation/TopBar";
import BottomPlayer from "@/components/player/BottomPlayer";
import MobileNav from "@/components/navigation/MobileNav";
import MobileFullPlayer from "@/components/player/MobileFullPlayer";
import QueueDrawer from "@/components/player/QueueDrawer";
import UploadModal from "@/components/modals/UploadModal";
import PlaylistModal from "@/components/modals/PlaylistModal";
import AddToPlaylistModal from "@/components/modals/AddToPlaylistModal";
import ShortcutsModal from "@/components/modals/ShortcutsModal";

import HomeView from "@/components/views/HomeView";
import SongsView from "@/components/views/SongsView";
import FavoritesView from "@/components/views/FavoritesView";
import PlaylistsView from "@/components/views/PlaylistsView";
import HistoryView from "@/components/views/HistoryView";
import SettingsView from "@/components/views/SettingsView";
import LibraryView from "@/components/views/LibraryView";
import OfflineView from "@/components/views/OfflineView";

function MainContent() {
  const { activeTab, selectedPlaylistId } = useLibrary();

  const renderActiveView = () => {
    if (selectedPlaylistId || activeTab === "playlists") {
      return <PlaylistsView />;
    }
    switch (activeTab) {
      case "home":
        return <HomeView />;
      case "songs":
        return <SongsView />;
      case "library":
        return <LibraryView />;
      case "favorites":
        return <FavoritesView />;
      case "history":
        return <HistoryView />;
      case "settings":
        return <SettingsView />;
      case "offline":
        return <OfflineView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
        <TopBar />
        <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain px-3 sm:px-4 md:px-8 pt-4 sm:pt-6 pb-5 md:pb-6">
          <div className="max-w-6xl mx-auto">{renderActiveView()}</div>
        </main>
      </div>

      {/* Slide-over Queue Drawer */}
      <QueueDrawer />
    </div>
  );
}

export default function App() {
  return (
    <LibraryProvider>
      <div className="soundify-shell h-dvh flex flex-col bg-[#0b0d10] text-[#f5f7fa] overflow-hidden">
        {/* Core Audio Engine */}
        <GlobalAudioPlayer />

        {/* Main Application Interface */}
        <MainContent />

        {/* Persistent Bottom Music Player */}
        <BottomPlayer />

        {/* Mobile Bottom Navigation */}
        <MobileNav />

        {/* Modals & Fullscreen Player */}
        <MobileFullPlayer />
        <UploadModal />
        <PlaylistModal />
        <AddToPlaylistModal />
        <ShortcutsModal />
      </div>
    </LibraryProvider>
  );
}
