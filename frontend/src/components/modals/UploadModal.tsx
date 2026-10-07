"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  X,
  Upload,
  Music,
  Check,
  Loader2,
  Trash2,
  AlertCircle,
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
import { formatDuration, formatFileSize } from "@/lib/utils";
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
      // Accept audio MIME or common audio extensions
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
        customAlbum: "Soundify Library",
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
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Failed to upload";
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

  // Upload all ready or failed items with controlled concurrency (e.g. 3 at a time)
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
    let completed = 0;

    const runWorker = async () => {
      while (index < pendingItems.length && !cancelRequestedRef.current) {
        const currentIndex = index++;
        const currentItem = pendingItems[currentIndex];
        setActiveUploadCount((c) => c + 1);
        await uploadSingleItem(currentItem);
        setActiveUploadCount((c) => Math.max(0, c - 1));
        completed++;
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Add Songs to Soundify
              </h2>
              <p className="text-xs text-slate-500 font-medium">
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
            className="p-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-blue-600 bg-blue-50/80 scale-[0.99]"
                : "border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/20"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.opus"
              onChange={(e) => {
                if (e.target.files) handleFilesSelected(e.target.files);
                e.target.value = ""; // Reset for re-selection
              }}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-xs">
                <FileAudio className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-900">
                Drop songs here or click to browse
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Select 1, 10, 50, or 100+ audio files • MP3 • WAV • M4A • OGG • FLAC • AAC
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-blue-600 font-semibold bg-blue-50 px-3 py-1 rounded-full border border-blue-200/50">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Automatic title, artist, album, and embedded artwork extraction</span>
              </div>
            </div>
          </div>

          {/* Selected Songs Queue */}
          {queue.length > 0 && (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Selected Songs ({queue.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {formatFileSize(totalSize)} total
                    {completedCount > 0 && ` • ${completedCount} uploaded`}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Download authorization switch */}
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer bg-slate-100 hover:bg-slate-200/70 px-2.5 py-1.5 rounded-xl transition-colors">
                    <input
                      type="checkbox"
                      checked={isAuthorizedDownload}
                      onChange={(e) => setIsAuthorizedDownload(e.target.checked)}
                      className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
                    />
                    <span className="font-semibold text-slate-700">
                      Allow download
                    </span>
                  </label>

                  {/* Add more button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAll}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100/70 border border-blue-200/70 rounded-xl transition-all disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add More</span>
                  </button>

                  {/* Clear all button */}
                  <button
                    onClick={handleClearAll}
                    disabled={isUploadingAll}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Table / Queue List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-96 overflow-y-auto shadow-xs">
                {queue.map((item) => {
                  const meta = item.metadata;
                  const coverUrl = meta?.coverBlobUrl;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors ${
                        item.status === "success"
                          ? "bg-emerald-50/40"
                          : item.status === "error"
                          ? "bg-rose-50/40"
                          : item.status === "uploading"
                          ? "bg-blue-50/30"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Left: Thumbnail & Input Fields */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Cover Art Preview */}
                        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs">
                          {coverUrl ? (
                            <Image
                              src={coverUrl}
                              alt={item.customTitle}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <Music className="w-5 h-5 text-blue-600" />
                            </div>
                          )}
                          {meta?.hasEmbeddedArtwork && (
                            <div
                              className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-blue-600 border border-white"
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
                              className="w-full text-xs font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 outline-none px-1 py-0.5 rounded truncate"
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
                              className="w-full text-xs text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 outline-none px-1 py-0.5 rounded truncate"
                            />
                          </div>

                          <div className="hidden sm:block">
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
                              className="w-full text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 outline-none px-1 py-0.5 rounded truncate"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Metadata Badges & Status */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Format & Duration */}
                        <div className="text-right hidden sm:block">
                          <p className="text-[11px] font-mono font-medium text-slate-700">
                            {formatDuration(meta?.duration || 0)}
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase font-mono">
                            {meta?.format || "AUDIO"} • {formatFileSize(item.file.size)}
                          </p>
                        </div>

                        {/* Status Badges */}
                        <div className="w-24 text-right">
                          {item.status === "extracting" && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-semibold animate-pulse">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Parsing</span>
                            </span>
                          )}

                          {item.status === "ready" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                              <Check className="w-3 h-3 text-slate-500" />
                              <span>Ready</span>
                            </span>
                          )}

                          {item.status === "uploading" && (
                            <div className="w-20">
                              <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full transition-all duration-200"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-blue-600 font-mono">
                                Uploading
                              </span>
                            </div>
                          )}

                          {item.status === "success" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Uploaded</span>
                            </span>
                          )}

                          {item.status === "error" && (
                            <button
                              onClick={() => uploadSingleItem(item)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 hover:bg-rose-200 text-[10px] font-bold transition-colors"
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
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
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
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {isUploadingAll ? (
              <span className="inline-flex items-center gap-2 text-blue-600 font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  Uploading {activeUploadCount} active • {completedCount} of {queue.length} completed
                </span>
              </span>
            ) : completedCount > 0 && completedCount === queue.length ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                All {completedCount} songs uploaded successfully!
              </span>
            ) : (
              <span>
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
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
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
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/25"
              >
                Upload More Songs
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUploadAll}
                disabled={isUploadingAll || readyCount === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
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
