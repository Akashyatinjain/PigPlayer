"use client";

import React, { useState } from "react";
import { X, FolderPlus, Loader2 } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const newPlaylist = await createPlaylist(name.trim(), description.trim());
      if (newPlaylist) {
        setIsPlaylistModalOpen(false);
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="mobile-safe-bottom max-h-[90dvh] w-full max-w-md overflow-y-auto bg-white border border-slate-200 rounded-t-3xl md:rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FolderPlus className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-extrabold text-slate-900 tracking-wide">
              Create New Playlist
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close create playlist"
            onClick={() => setIsPlaylistModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Playlist Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chill Wave Vibes"
              className="w-full min-h-11 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-base sm:text-sm text-slate-900 px-3 py-2.5 rounded-xl outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes this collection special?"
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-base sm:text-sm text-slate-900 px-3 py-2 rounded-xl outline-none resize-none font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsPlaylistModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex min-h-11 items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/25 disabled:opacity-50"
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
