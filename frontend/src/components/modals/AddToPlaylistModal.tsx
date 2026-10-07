"use client";

import React, { useState } from "react";
import { X, FolderPlus, Plus, Check, Loader2 } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";

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

  const handleAdd = async (playlistId: string) => {
    setLoadingId(playlistId);
    try {
      const ok = await addSongToPlaylist(playlistId, songForPlaylist.id);
      if (ok) {
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
        setAddedMap((prev) => ({ ...prev, [playlist.id]: true }));
        setIsCreatingNew(false);
        setNewPlaylistName("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Add to Playlist</h2>
            <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
              {songForPlaylist.title} • {songForPlaylist.artist}
            </p>
          </div>
          <button
            onClick={() => setIsAddToPlaylistOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* List of Playlists */}
          <div className="max-h-60 overflow-y-auto space-y-1">
            {playlists.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
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
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all ${
                      isAdded
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="font-semibold truncate">{pl.name}</span>
                    <span className="shrink-0 ml-2">
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      ) : isAdded ? (
                        <Check className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Create Playlist */}
          <div className="pt-2 border-t border-slate-100">
            {isCreatingNew ? (
              <form onSubmit={handleCreateAndAdd} className="space-y-2">
                <input
                  type="text"
                  autoFocus
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="New playlist name..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-xs text-slate-900 px-3 py-2 rounded-xl outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-lg shadow-sm hover:bg-blue-700"
                  >
                    Create & Add
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsCreatingNew(true)}
                className="w-full py-2 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1.5 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Create New Playlist</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
