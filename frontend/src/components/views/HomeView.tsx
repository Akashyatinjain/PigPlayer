"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ArrowRight, Disc3, Music2, Pause, Play, Plus, HardDriveDownload, FolderPlus } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { offlineStorageService } from "@/services/offline-storage.service";
import { triggerHaptic } from "@/lib/haptics";
import SongRow from "@/components/music/SongRow";

export default function HomeView() {
  const {
    songs,
    favorites,
    history,
    playlists,
    isLoading,
    setActiveTab,
    setSelectedPlaylistId,
    setIsUploadOpen,
    refreshOfflineSongs,
    offlineSongs,
  } = useLibrary();
  const { currentSong, isPlaying, playSong, togglePlayPause } = usePlayerStore();
  const featuredSong = currentSong || songs[0];

  const localTracks = offlineSongs.filter((s) => s.id.startsWith("local-") || s.isOfflineAvailable);

  const [featuredImgError, setFeaturedImgError] = useState(false);
  const [isImportingLocal, setIsImportingLocal] = useState(false);
  const deviceFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const folderInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleDeviceFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const audioFiles = Array.from(files).filter((file) =>
      file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac|aac|wma|opus)$/i.test(file.name)
    );
    if (audioFiles.length === 0) return;

    setIsImportingLocal(true);
    triggerHaptic("medium");
    try {
      const imported: any[] = [];
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
    } finally {
      setIsImportingLocal(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8 sm:space-y-10 text-[#f5f7fa]">
      <div className="flex items-end justify-between gap-4 pt-1">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Your space, your sound</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Good evening</h1>
        </div>
        {/* Hidden Device Audio Picker */}
        <input
          ref={deviceFileInputRef}
          type="file"
          multiple
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.opus"
          onChange={(e) => {
            handleDeviceFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />

        {/* Hidden Device Folder Picker */}
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error webkitdirectory is standard in HTML5 browsers
          webkitdirectory=""
          directory=""
          multiple
          onChange={(e) => {
            handleDeviceFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />

        <div className="flex items-center gap-2">
          {/* Quick Play Local Songs Button */}
          <button
            type="button"
            onClick={() => deviceFileInputRef.current?.click()}
            disabled={isImportingLocal}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3.5 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-900/40 hover:text-emerald-300 shadow-sm active:scale-95 disabled:opacity-50"
            title="Import and play songs directly from your phone/computer without uploading"
          >
            <HardDriveDownload className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isImportingLocal ? "Loading..." : "Play Local Audio"}
            </span>
            <span className="sm:hidden">
              {isImportingLocal ? "..." : "Local"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#232b35] bg-[#141922] px-3.5 text-sm font-medium text-slate-300 transition-colors hover:bg-[#1b222e] hover:text-white active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add music</span>
          </button>
        </div>
      </div>

      {isLoading && (
        <div aria-label="Loading your music" className="space-y-3">
          <div className="h-44 animate-pulse rounded-2xl border border-[#232b35] bg-[#12161d] sm:h-52" />
          <div className="h-6 w-40 animate-pulse rounded bg-[#12161d]" />
          <div className="grid grid-cols-3 gap-3">
            <div className="aspect-square animate-pulse rounded-xl bg-[#12161d]" />
            <div className="aspect-square animate-pulse rounded-xl bg-[#12161d]" />
            <div className="aspect-square animate-pulse rounded-xl bg-[#12161d]" />
          </div>
        </div>
      )}

      {!isLoading && featuredSong ? (
        <section className="relative isolate overflow-hidden rounded-2xl border border-[#232b35] bg-[#0d1015] p-4 sm:p-6 shadow-md">
          <div className="absolute inset-0 -z-10 opacity-[0.08] blur-3xl" style={{ backgroundImage: featuredSong.coverUrl && !featuredImgError ? `url("${featuredSong.coverUrl}")` : undefined, backgroundPosition: "center", backgroundSize: "cover" }} />
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#161c24] border border-[#232b35] sm:h-32 sm:w-32">
              {featuredSong.coverUrl && !featuredImgError ? (
                <Image
                  src={featuredSong.coverUrl}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  onError={() => setFeaturedImgError(true)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-blue-400">
                  <Music2 className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-400"><Disc3 className="h-3.5 w-3.5" />{currentSong ? "Now playing" : "Picked for you"}</p>
              <h2 className="mt-2 line-clamp-2 text-lg font-bold tracking-tight text-white sm:text-2xl">{featuredSong.title}</h2>
              <p className="mt-1 truncate text-sm text-slate-400">{featuredSong.artist}</p>
              <button
                type="button"
                onClick={() => currentSong?.id === featuredSong.id ? togglePlayPause() : playSong(featuredSong, songs)}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-all hover:bg-blue-500 shadow-md shadow-blue-600/30 active:scale-[0.98]"
              >
                {currentSong?.id === featuredSong.id && isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                {currentSong?.id === featuredSong.id && isPlaying ? "Pause" : "Play now"}
              </button>
            </div>
          </div>
        </section>
      ) : !isLoading ? (
        <section className="rounded-2xl border border-[#232b35] bg-[#0d1015] px-6 py-10 text-center sm:py-14">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#141922] text-blue-400"><Music2 className="h-7 w-7" /></span>
          <h2 className="mt-4 text-lg font-bold text-white">Your library is quiet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">Bring your music in and make this space yours.</p>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-600/30"
          >
            <Plus className="h-4 w-4" />
            Add songs
          </button>
        </section>
      ) : null}

      {/* 📁 Device Local Storage Section (Directly visible on Home) */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <HardDriveDownload className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">Device Local Storage</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                  No Upload
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {localTracks.length > 0 ? `${localTracks.length} tracks stored locally on this device` : "Play audio directly from your device storage"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#232b35] bg-[#141922] hover:bg-[#1c2432] text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              title="Import an entire folder of music from your device"
            >
              <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
              <span>Import Folder</span>
            </button>

            <button
              type="button"
              onClick={() => deviceFileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/50 text-xs font-semibold text-emerald-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{localTracks.length > 0 ? "Add More" : "Pick Songs"}</span>
            </button>
          </div>
        </div>

        {/* If local tracks exist, render a rail of local tracks! */}
        {localTracks.length > 0 ? (
          <div className="horizontal-rail">
            {localTracks.map((song) => (
              <button
                key={song.id}
                type="button"
                onClick={() => playSong(song, localTracks)}
                className="group w-36 shrink-0 snap-start text-left sm:w-44"
              >
                <span className="relative block aspect-square overflow-hidden rounded-xl bg-[#141922] border border-emerald-500/20 group-hover:border-emerald-400/50 transition-colors shadow-sm">
                  {song.coverUrl ? (
                    <Image
                      src={song.coverUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-emerald-400/60 bg-emerald-950/20">
                      <Music2 className="h-8 w-8" />
                    </span>
                  )}
                  <span className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </span>
                </span>
                <span className="mt-2 block truncate text-sm font-medium text-white group-hover:text-emerald-300 transition-colors">
                  {song.title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-400">
                  {song.artist}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-5 rounded-2xl border border-dashed border-emerald-500/25 bg-emerald-950/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25">
                <HardDriveDownload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">No local files loaded yet</h3>
                <p className="text-xs text-slate-400">
                  Select audio files or a folder from your device to play immediately offline with zero upload.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl border border-[#232b35] bg-[#141922] hover:bg-[#1a212b] text-xs font-semibold text-slate-200 transition-colors"
              >
                Select Folder
              </button>
              <button
                type="button"
                onClick={() => deviceFileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 active:scale-95"
              >
                Choose Audio Files
              </button>
            </div>
          </div>
        )}
      </section>

      {history.length > 0 && (
        <SongRail title="Recently played" action="See history" onAction={() => setActiveTab("history")} songs={history.slice(0, 10).map((item) => item.song)} allSongs={songs} playSong={playSong} />
      )}
      {favorites.length > 0 && (
        <SongRail title="Your favorites" action="See all" onAction={() => setActiveTab("favorites")} songs={favorites.slice(0, 10)} allSongs={favorites} playSong={playSong} />
      )}

      {playlists.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-white">Made by you</h2>
            <button type="button" onClick={() => { setSelectedPlaylistId(null); setActiveTab("playlists"); }} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-slate-400 hover:text-blue-400">Playlists <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="horizontal-rail">
            {playlists.map((playlist) => (
              <button key={playlist.id} type="button" onClick={() => { setSelectedPlaylistId(playlist.id); setActiveTab("playlists"); }} className="group w-36 shrink-0 snap-start text-left sm:w-44">
                <span className="relative block aspect-square overflow-hidden rounded-xl bg-[#141922] border border-[#232b35]">
                  {playlist.coverUrl ? <Image src={playlist.coverUrl} alt="" fill unoptimized className="object-cover transition-transform duration-200 group-hover:scale-[1.03]" /> : <span className="flex h-full items-center justify-center text-slate-500"><Disc3 className="h-8 w-8" /></span>}
                </span>
                <span className="mt-2 block truncate text-sm font-medium text-white">{playlist.name}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{playlist._count?.songs ?? 0} songs</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {songs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-white">All songs</h2>
            <button type="button" onClick={() => setActiveTab("songs")} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-slate-400 hover:text-blue-400">Browse all <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="divide-y divide-[#1f2631] overflow-hidden rounded-2xl border border-[#232b35] bg-[#0d1015]">
            {songs.slice(0, 5).map((song, index) => <SongRow key={song.id} song={song} index={index} allSongs={songs} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function SongRail({ title, action, onAction, songs, allSongs, playSong }: {
  title: string;
  action: string;
  onAction: () => void;
  songs: import("@/types/music").Song[];
  allSongs: import("@/types/music").Song[];
  playSong: (song: import("@/types/music").Song, queue?: import("@/types/music").Song[]) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
        <button type="button" onClick={onAction} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-slate-400 hover:text-blue-400">{action}<ArrowRight className="h-4 w-4" /></button>
      </div>
      <div className="horizontal-rail">
        {songs.map((song, index) => (
          <RailCard key={`${song.id}-${index}`} song={song} allSongs={allSongs} playSong={playSong} />
        ))}
      </div>
    </section>
  );
}

function RailCard({
  song,
  allSongs,
  playSong,
}: {
  song: import("@/types/music").Song;
  allSongs: import("@/types/music").Song[];
  playSong: (song: import("@/types/music").Song, queue?: import("@/types/music").Song[]) => void;
}) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <button type="button" onClick={() => playSong(song, allSongs)} className="group w-36 shrink-0 snap-start text-left sm:w-44">
      <span className="relative block aspect-square overflow-hidden rounded-xl bg-[#141922] border border-[#232b35]">
        {song.coverUrl && !imgErr ? (
          <Image
            src={song.coverUrl}
            alt=""
            fill
            unoptimized
            className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            onError={() => setImgErr(true)}
          />
        ) : (
          <span className="flex h-full items-center justify-center bg-linear-to-br from-[#121c2a] to-[#182333] text-blue-400">
            <Music2 className="h-8 w-8" />
          </span>
        )}
      </span>
      <span className="mt-2 block truncate text-sm font-semibold text-white">{song.title}</span>
      <span className="mt-0.5 block truncate text-xs text-slate-400">{song.artist}</span>
    </button>
  );
}
