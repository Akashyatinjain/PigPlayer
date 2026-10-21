"use client";

import React, { useState } from "react";
import { X, FolderPlus, Plus, Check, Loader2 } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { closeWithHistory } from "@/hooks/useMobileNavigation";
import { triggerHaptic } from "@/lib/haptics";

export default function AddToPlaylistModal() {
  const {
    isAddToPlaylistOpen,
    setIsAddToPlaylistOpen,
    songForPlaylist,
    playlists,
    addSongToPlaylist,
    createPlaylist,
  } = useLibrary();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!isAddToPlaylistOpen || !songForPlaylist) return null;

  const handleClose = () => {
    triggerHaptic("light");
    closeWithHistory(() => setIsAddToPlaylistOpen(false));
  };

  const handleAdd = async (playlistId: string) => {
    triggerHaptic("medium");
    setLoadingId(playlistId);
    try {
      const ok = await addSongToPlaylist(playlistId, songForPlaylist.id);
      if (ok) {
        triggerHaptic("success");
        setAddedMap((prev) => ({ ...prev, [playlistId]: true }));
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    try {
      const playlist = await createPlaylist(newPlaylistName.trim());
      if (playlist) {
        await addSongToPlaylist(playlist.id, songForPlaylist.id);
        triggerHaptic("success");
        setAddedMap((prev) => ({ ...prev, [playlist.id]: true }));
        setIsCreatingNew(false);
        setNewPlaylistName("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-150">
      <div className="mobile-safe-bottom w-full max-w-sm bg-[#10141d] border border-[#232b38] rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95 duration-200 text-[#f5f7fa]">
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto my-2 md:hidden" />

        <div className="px-5 py-3.5 border-b border-[#1c232e] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-white">Add to Playlist</h2>
            <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
              {songForPlaylist.title} • {songForPlaylist.artist}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close add to playlist"
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-[#181f2a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* List of Playlists */}
          <div className="max-h-60 overflow-y-auto space-y-1">
            {playlists.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                No playlists created yet.
              </p>
            ) : (
              playlists.map((pl) => {
                const isAdded = addedMap[pl.id];
                const isLoading = loadingId === pl.id;

                return (
                  <button
                    key={pl.id}
                    onClick={() => handleAdd(pl.id)}
                    disabled={isLoading || isAdded}
                    className={`w-full min-h-12 flex items-center justify-between p-3 rounded-xl text-left text-sm transition-all ${
                      isAdded
                        ? "bg-blue-600/15 text-blue-400 border border-blue-500/30"
                        : "hover:bg-[#181f2a] text-slate-200 border border-transparent"
                    }`}
                  >
                    <span className="font-semibold truncate">{pl.name}</span>
                    <span className="shrink-0 ml-2">
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      ) : isAdded ? (
                        <Check className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Create Playlist */}
          <div className="pt-2 border-t border-[#1c232e]">
            {isCreatingNew ? (
              <form onSubmit={handleCreateAndAdd} className="space-y-2">
                <input
                  type="text"
                  autoFocus
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="New playlist name..."
                  className="w-full bg-[#181f2a] border border-[#232b38] focus:border-blue-500 text-xs text-white placeholder-slate-500 px-3 py-2.5 rounded-xl outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-blue-500 transition-colors"
                  >
                    Create & Add
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => {
                  triggerHaptic("light");
                  setIsCreatingNew(true);
                }}
                className="w-full py-2.5 text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1.5 rounded-xl hover:bg-blue-600/10 transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Create New Playlist</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
