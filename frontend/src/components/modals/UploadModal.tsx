"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  X,
  Upload,
  Music,
  Check,
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
  Sparkles,
  FileAudio,
  CheckCircle2,
} from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import {
  extractAudioMetadata,
  ExtractedAudioMetadata,
} from "@/lib/metadata/audioMetadata";
import { formatDuration, formatFileSize, getErrorMessage } from "@/lib/utils";
import { uploadService } from "@/services/upload.service";
import { songService } from "@/services/song.service";

interface UploadQueueItem {
  id: string;
  file: File;
  metadata: ExtractedAudioMetadata | null;
  status: "extracting" | "ready" | "uploading" | "success" | "error";
  progress: number; // 0 to 100
  errorMessage?: string;
  // User editable overrides
  customTitle: string;
  customArtist: string;
  customAlbum: string;
}

export default function UploadModal() {
  const { isUploadOpen, setIsUploadOpen, refreshLibrary } = useLibrary();

  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAuthorizedDownload, setIsAuthorizedDownload] = useState(true);
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const [activeUploadCount, setActiveUploadCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cancelRequestedRef = useRef(false);

  if (!isUploadOpen) return null;

  // Process newly selected files and extract metadata automatically
  const handleFilesSelected = (files: FileList | File[]) => {
    const audioFiles = Array.from(files).filter((file) => {
      return (
        file.type.startsWith("audio/") ||
        /\.(mp3|wav|ogg|m4a|flac|aac|wma|opus)$/i.test(file.name)
      );
    });

    if (audioFiles.length === 0) return;

    // Create queue items
    const newItems: UploadQueueItem[] = audioFiles.map((file) => {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        metadata: null,
        status: "extracting",
        progress: 0,
        customTitle: cleanName,
        customArtist: "Unknown Artist",
        customAlbum: "piGGyPlayer Library",
      };
    });

    setQueue((prev) => [...prev, ...newItems]);

    // Extract metadata for each file
    newItems.forEach((item) => {
      extractAudioMetadata(item.file)
        .then((meta) => {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    metadata: meta,
                    status: "ready",
                    customTitle: meta.title,
                    customArtist: meta.artist,
                    customAlbum: meta.album,
                  }
                : q
            )
          );
        })
        .catch((err) => {
          console.warn("Metadata extraction error for", item.file.name, err);
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: "ready" } : q
            )
          );
        });
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    if (isUploadingAll) return;
    setQueue([]);
  };

  // Upload an individual queue item
  const uploadSingleItem = async (item: UploadQueueItem): Promise<boolean> => {
    try {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: "uploading", progress: 5 } : q
        )
      );

      // Pre-check for duplicate if hash is available
      if (item.metadata?.fileHash) {
        try {
          const dupRes = await songService.checkDuplicate({
            fileHash: item.metadata.fileHash,
          });
          if (dupRes?.isDuplicate) {
            console.log("Duplicate detected for", item.file.name);
          }
        } catch {
          // ignore duplicate pre-check error
        }
      }

      await uploadService.uploadSong(
        item.file,
        {
          title: item.customTitle.trim() || item.file.name,
          artist: item.customArtist.trim() || "Unknown Artist",
          album: item.customAlbum.trim() || undefined,
          genre: item.metadata?.genre || undefined,
          duration: item.metadata?.duration || 0,
          fileName: item.file.name,
          fileHash: item.metadata?.fileHash,
          trackNumber: item.metadata?.trackNumber,
          releaseYear: item.metadata?.year,
          bitrate: item.metadata?.bitrate,
          isDownloadable: isAuthorizedDownload,
        },
        item.metadata?.coverBlob,
        (progress) => {
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, progress } : q))
          );
        }
      );

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: "success", progress: 100, errorMessage: undefined }
            : q
        )
      );

      return true;
    } catch (err: unknown) {
      const errMsg = getErrorMessage(err, "Failed to upload");
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                status: "error",
                progress: 0,
                errorMessage: errMsg,
              }
            : q
        )
      );
      return false;
    }
  };

  // Upload all ready or failed items with concurrency
  const handleUploadAll = async () => {
    if (isUploadingAll) return;
    const pendingItems = queue.filter(
      (item) => item.status === "ready" || item.status === "error"
    );

    if (pendingItems.length === 0) return;

    setIsUploadingAll(true);
    cancelRequestedRef.current = false;

    const concurrency = 3;
    let index = 0;

    const runWorker = async () => {
      while (!cancelRequestedRef.current) {
        const currentIndex = index++;
        if (currentIndex >= pendingItems.length) break;
        const currentItem = pendingItems[currentIndex];
        if (!currentItem) break;

        setActiveUploadCount((c) => c + 1);
        try {
          await uploadSingleItem(currentItem);
        } finally {
          setActiveUploadCount((c) => Math.max(0, c - 1));
        }
      }
    };

    const workers = [];
    for (let i = 0; i < Math.min(concurrency, pendingItems.length); i++) {
      workers.push(runWorker());
    }

    await Promise.all(workers);

    setIsUploadingAll(false);
    refreshLibrary();
  };

  const completedCount = queue.filter((i) => i.status === "success").length;
  const readyCount = queue.filter(
    (i) => i.status === "ready" || i.status === "error"
  ).length;
  const totalSize = queue.reduce((acc, i) => acc + i.file.size, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-150">
      <div className="mobile-safe-bottom w-full max-w-4xl bg-[#0d1015] border border-[#232a35] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-env(safe-area-inset-top))] md:max-h-[92dvh] overflow-hidden text-[#f5f7fa]">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#1f2631] flex items-center justify-between bg-[#131820] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Add Songs to piGGyPlayer
              </h2>
              <p className="text-xs text-slate-400 font-normal">
                Upload multiple audio files at once with automatic metadata extraction
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isUploadingAll) {
                if (confirm("Upload in progress. Cancel remaining uploads and close?")) {
                  cancelRequestedRef.current = true;
                  setIsUploadOpen(false);
                }
              } else {
                setIsUploadOpen(false);
              }
            }}
            aria-label="Close upload"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-[#1c2432] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 bg-[#0d1015]">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.opus"
            onChange={(e) => {
              if (e.target.files) handleFilesSelected(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
          />

          {/* Drag & Drop Zone */}
          {queue.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-500/10 scale-[0.99]"
                  : "border-[#293444] hover:border-blue-500/70 bg-[#131820]/60 hover:bg-[#181f2a]"
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/25 shadow-md">
                  <FileAudio className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-white">
                  Drop songs here or click to browse
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  MP3 · WAV · M4A · OGG · FLAC · AAC
                </p>
                <div className="flex max-w-full items-center gap-2 pt-1 text-[11px] text-blue-400 font-medium bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Song details and cover art are extracted automatically</span>
                </div>
              </div>
            </div>
          ) : (
            /* Compact drop banner when queue is populated */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-500/15"
                  : "border-[#293444] bg-[#131820]/60 hover:bg-[#181f2a] hover:border-blue-500/60"
              }`}
            >
              <div className="flex items-center gap-3 text-xs">
                <FileAudio className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-slate-300 font-medium">
                  Drop more audio files here or click to add
                </span>
              </div>
              <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                + Add Files
              </span>
            </div>
          )}

          {/* Selected Songs Queue */}
          {queue.length > 0 && (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Selected Songs ({queue.length})
                  </h3>
                  <p className="text-xs text-slate-400 font-normal">
                    {formatFileSize(totalSize)} total
                    {completedCount > 0 && ` • ${completedCount} uploaded`}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Download authorization switch */}
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-[#181f2a] hover:bg-[#1f2835] border border-[#293444] px-3 py-1.5 rounded-xl transition-colors">
                    <input
                      type="checkbox"
                      checked={isAuthorizedDownload}
                      onChange={(e) => setIsAuthorizedDownload(e.target.checked)}
                      className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
                    />
                    <span className="font-medium text-slate-300">
                      Allow download
                    </span>
                  </label>

                  {/* Add more button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-400 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-xl transition-all disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add More</span>
                  </button>

                  {/* Clear all button */}
                  <button
                    onClick={handleClearAll}
                    disabled={isUploadingAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Table / Queue List */}
              <div className="border border-[#232a35] rounded-2xl overflow-hidden divide-y divide-[#1e2531] bg-[#131820] max-h-[50vh] overflow-y-auto shadow-lg">
                {queue.map((item) => {
                  const meta = item.metadata;
                  const coverUrl = meta?.coverBlobUrl;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors ${
                        item.status === "success"
                          ? "bg-emerald-950/20 border-l-2 border-emerald-500"
                          : item.status === "error"
                          ? "bg-rose-950/20 border-l-2 border-rose-500"
                          : item.status === "uploading"
                          ? "bg-blue-950/25 border-l-2 border-blue-500"
                          : "hover:bg-[#181f2a]"
                      }`}
                    >
                      {/* Left: Thumbnail & Input Fields */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Cover Art Preview */}
                        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0 shadow-sm">
                          {coverUrl ? (
                            <Image
                              src={coverUrl}
                              alt={item.customTitle}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                              <Music className="w-5 h-5 text-blue-400" />
                            </div>
                          )}
                          {meta?.hasEmbeddedArtwork && (
                            <div
                              className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 ring-1 ring-black"
                              title="Embedded artwork extracted from file"
                            />
                          )}
                        </div>

                        {/* Title, Artist, Album Inline Inputs */}
                        <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <input
                              type="text"
                              value={item.customTitle}
                              disabled={item.status === "uploading" || item.status === "success"}
                              onChange={(e) => {
                                const val = e.target.value;
                                setQueue((prev) =>
                                  prev.map((q) =>
                                    q.id === item.id
                                      ? { ...q, customTitle: val }
                                      : q
                                  )
                                );
                              }}
                              placeholder="Title"
                              className="w-full text-xs font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:bg-[#1c2432] outline-none px-1.5 py-1 rounded truncate transition-colors"
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              value={item.customArtist}
                              disabled={item.status === "uploading" || item.status === "success"}
                              onChange={(e) => {
                                const val = e.target.value;
                                setQueue((prev) =>
                                  prev.map((q) =>
                                    q.id === item.id
                                      ? { ...q, customArtist: val }
                                      : q
                                  )
                                );
                              }}
                              placeholder="Artist"
                              className="w-full text-xs text-slate-300 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:bg-[#1c2432] outline-none px-1.5 py-1 rounded truncate transition-colors"
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              value={item.customAlbum}
                              disabled={item.status === "uploading" || item.status === "success"}
                              onChange={(e) => {
                                const val = e.target.value;
                                setQueue((prev) =>
                                  prev.map((q) =>
                                    q.id === item.id
                                      ? { ...q, customAlbum: val }
                                      : q
                                  )
                                );
                              }}
                              placeholder="Album"
                              className="w-full text-xs text-slate-400 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:bg-[#1c2432] outline-none px-1.5 py-1 rounded truncate transition-colors"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Metadata Badges & Status */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Format & Duration */}
                        <div className="text-right hidden sm:block">
                          <p className="text-[11px] font-mono font-medium text-slate-300">
                            {formatDuration(meta?.duration || 0)}
                          </p>
                          <p className="text-[10px] text-slate-500 uppercase font-mono">
                            {meta?.format || "AUDIO"} • {formatFileSize(item.file.size)}
                          </p>
                        </div>

                        {/* Status Badges */}
                        <div className="w-24 text-right">
                          {item.status === "extracting" && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 font-semibold animate-pulse">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Parsing</span>
                            </span>
                          )}

                          {item.status === "ready" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1c2432] text-slate-300 border border-[#283342] text-[10px] font-bold">
                              <Check className="w-3 h-3 text-slate-400" />
                              <span>Ready</span>
                            </span>
                          )}

                          {item.status === "uploading" && (
                            <div className="w-20">
                              <div className="h-1.5 w-full bg-[#1f2837] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all duration-200"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-blue-400 font-mono">
                                Uploading
                              </span>
                            </div>
                          )}

                          {item.status === "success" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Uploaded</span>
                            </span>
                          )}

                          {item.status === "error" && (
                            <button
                              onClick={() => uploadSingleItem(item)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 text-[10px] font-bold transition-colors"
                              title={item.errorMessage || "Click to retry"}
                            >
                              <RefreshCw className="w-2.5 h-2.5" />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>

                        {/* Remove Track Button */}
                        {item.status !== "uploading" && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove from batch"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#1f2631] bg-[#131820] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            {isUploadingAll ? (
              <span className="inline-flex items-center gap-2 text-blue-400 font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  Uploading {activeUploadCount} active • {completedCount} of {queue.length} completed
                </span>
              </span>
            ) : completedCount > 0 && completedCount === queue.length ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                All {completedCount} songs uploaded successfully!
              </span>
            ) : (
              <span className="text-slate-400">
                {readyCount > 0
                  ? `${readyCount} ${readyCount === 1 ? "song" : "songs"} ready to upload`
                  : "Select songs to begin"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                if (isUploadingAll) {
                  cancelRequestedRef.current = true;
                }
                setIsUploadOpen(false);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#1c2432] rounded-xl transition-colors"
            >
              {completedCount === queue.length && completedCount > 0
                ? "Close"
                : "Cancel"}
            </button>

            {completedCount === queue.length && completedCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setQueue([]);
                  fileInputRef.current?.click();
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 active:scale-95"
              >
                Upload More Songs
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUploadAll}
                disabled={isUploadingAll || readyCount === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading Songs...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload {readyCount > 0 ? `${readyCount} Songs` : "Songs"}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
