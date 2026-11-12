"use client";

import React, { useState } from "react";
import { X, FolderPlus, Loader2 } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { closeWithHistory } from "@/hooks/useMobileNavigation";
import { triggerHaptic } from "@/lib/haptics";

export default function PlaylistModal() {
  const {
    isPlaylistModalOpen,
    setIsPlaylistModalOpen,
    createPlaylist,
    setSelectedPlaylistId,
    setActiveTab,
  } = useLibrary();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isPlaylistModalOpen) return null;

  const handleClose = () => {
    triggerHaptic("light");
    closeWithHistory(() => setIsPlaylistModalOpen(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    triggerHaptic("medium");
    try {
      const newPlaylist = await createPlaylist(name.trim(), description.trim());
      if (newPlaylist) {
        triggerHaptic("success");
        handleClose();
        setName("");
        setDescription("");
        setSelectedPlaylistId(newPlaylist.id);
        setActiveTab("playlists");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-150"
    >
      <div className="mobile-safe-bottom max-h-[90dvh] w-full max-w-md overflow-y-auto bg-[#0E121A]/95 border border-white/[0.08] text-[#F8FAFC] rounded-t-3xl md:rounded-2xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200">
        {/* Mobile Top Drag Indicator */}
        <div
          className="w-12 h-1.5 bg-white/20 hover:bg-white/40 active:bg-white/60 rounded-full mx-auto my-2.5 md:hidden shrink-0 cursor-grab"
          onClick={handleClose}
        />

        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF4D80]/15 text-[#FF4D80] border border-[#FF4D80]/25 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Create New Playlist
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close create playlist"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Playlist Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chill Wave Vibes"
              className="w-full min-h-11 bg-white/[0.04] border border-white/[0.08] focus:border-[#FF4D80] focus:bg-white/[0.06] text-base sm:text-sm text-white px-3.5 py-2.5 rounded-xl outline-none font-medium placeholder-[#64748B] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes this collection special?"
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-[#FF4D80] focus:bg-white/[0.06] text-base sm:text-sm text-white px-3.5 py-2 rounded-xl outline-none resize-none font-medium placeholder-[#64748B] transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex min-h-11 items-center gap-2 px-5 py-2.5 bg-[#FF4D80] hover:bg-[#FF6694] text-white text-xs font-semibold rounded-xl active:scale-95 transition-all shadow-lg shadow-[#FF4D80]/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Playlist</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
