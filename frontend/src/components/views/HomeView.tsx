"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ArrowRight, Disc3, Music2, Pause, Play, Plus, HardDriveDownload, FolderPlus } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { offlineStorageService } from "@/services/offline-storage.service";
import { triggerHaptic } from "@/lib/haptics";
import SongRow from "@/components/music/SongRow";
import { Song } from "@/types/music";

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

  const [failedFeaturedImgId, setFailedFeaturedImgId] = useState<string | null>(null);
  const featuredImgError = featuredSong ? failedFeaturedImgId === featuredSong.id : false;
  const [isImportingLocal, setIsImportingLocal] = useState(false);
  const deviceFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const folderInputRef = React.useRef<HTMLInputElement | null>(null);

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const handleDeviceFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const audioFiles = Array.from(files).filter((file) =>
      file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac|aac|wma|opus)$/i.test(file.name)
    );
    if (audioFiles.length === 0) return;

    setIsImportingLocal(true);
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
    } finally {
      setIsImportingLocal(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8 sm:space-y-10 text-white">
      <div className="flex items-end justify-between gap-4 pt-1">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Your space, your sound</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{greeting}</h1>
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

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Play Local Songs Button */}
          <button
            type="button"
            onClick={() => deviceFileInputRef.current?.click()}
            disabled={isImportingLocal}
            className="flex min-h-10 sm:min-h-11 shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-400 transition-all hover:bg-emerald-900/40 hover:text-emerald-300 shadow-sm active:scale-95 disabled:opacity-50"
            title="Import and play songs directly from your phone/computer without uploading"
          >
            <HardDriveDownload className="h-4 w-4" />
            <span>
              {isImportingLocal ? "Importing..." : "Play Local"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="flex min-h-10 sm:min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.06] px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium text-[#94A3B8] transition-colors hover:bg-white/[0.1] hover:text-white active:scale-95"
          >
            <Plus className="h-4 w-4 text-[#FF4D80]" />
            <span>Add Music</span>
          </button>
        </div>
      </div>

      {isLoading && (
        <div aria-label="Loading your music" className="space-y-3">
          <div className="h-44 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.04] sm:h-52" />
          <div className="h-6 w-40 animate-pulse rounded bg-white/[0.04]" />
          <div className="grid grid-cols-3 gap-3">
            <div className="aspect-square animate-pulse rounded-xl bg-white/[0.04]" />
            <div className="aspect-square animate-pulse rounded-xl bg-white/[0.04]" />
            <div className="aspect-square animate-pulse rounded-xl bg-white/[0.04]" />
          </div>
        </div>
      )}

      {!isLoading && featuredSong ? (
        <section className="relative isolate overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E121A] p-4 sm:p-6 shadow-xl">
          <div className="absolute inset-0 -z-10 opacity-[0.14] blur-3xl" style={{ backgroundImage: featuredSong.coverUrl && !featuredImgError ? `url("${featuredSong.coverUrl}")` : undefined, backgroundPosition: "center", backgroundSize: "cover" }} />
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white/[0.06] border border-white/[0.08] sm:h-32 sm:w-32 shadow-md">
              {featuredSong.coverUrl && !featuredImgError ? (
                <Image
                  src={featuredSong.coverUrl}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  onError={() => {
                    if (featuredSong) setFailedFeaturedImgId(featuredSong.id);
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[#FF4D80]">
                  <Music2 className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#FF4D80]"><Disc3 className="h-3.5 w-3.5" />{currentSong ? "Now playing" : "Picked for you"}</p>
              <h2 className="mt-2 line-clamp-2 text-lg font-bold tracking-tight text-white sm:text-2xl">{featuredSong.title}</h2>
              <p className="mt-1 truncate text-sm text-[#94A3B8]">{featuredSong.artist}</p>
              <button
                type="button"
                onClick={() => {
                  if (currentSong?.id === featuredSong.id) {
                    togglePlayPause();
                  } else {
                    const fallbackQueue = songs.length > 0 ? songs : (localTracks.length > 0 ? localTracks : [featuredSong]);
                    playSong(featuredSong, fallbackQueue);
                  }
                }}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#FF4D80] px-5 text-sm font-semibold text-white transition-all hover:bg-[#FF6694] shadow-lg shadow-[#FF4D80]/25 active:scale-[0.98]"
              >
                {currentSong?.id === featuredSong.id && isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                {currentSong?.id === featuredSong.id && isPlaying ? "Pause" : "Play now"}
              </button>
            </div>
          </div>
        </section>
      ) : !isLoading ? (
        <section className="rounded-2xl border border-white/[0.08] bg-[#0E121A] px-6 py-10 text-center sm:py-14">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-[#FF4D80]"><Music2 className="h-7 w-7" /></span>
          <h2 className="mt-4 text-lg font-bold text-white">Your library is quiet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-[#94A3B8]">Bring your music in and make this space yours.</p>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#FF4D80] px-5 text-sm font-semibold text-white hover:bg-[#FF6694] shadow-lg shadow-[#FF4D80]/25"
          >
            <Plus className="h-4 w-4" />
            Add songs
          </button>
        </section>
      ) : null}

      {/* 📁 Device Local Storage Section (Directly visible on Home) */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <HardDriveDownload className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
                  Device Local Storage
                </h2>
                <span className="whitespace-nowrap px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                  No Upload
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] font-medium truncate">
                {localTracks.length > 0 ? `${localTracks.length} tracks stored locally on this device` : "Play audio directly from your device storage"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors whitespace-nowrap"
              title="Import an entire folder of music from your device"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#FF4D80]" />
              <span>Import Folder</span>
            </button>

            <button
              type="button"
              onClick={() => deviceFileInputRef.current?.click()}
              className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/50 text-xs font-semibold text-emerald-300 transition-colors shrink-0"
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
              <DeviceTrackCard
                key={song.id}
                song={song}
                localTracks={localTracks}
                playSong={playSong}
              />
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
                <p className="text-xs text-[#94A3B8]">
                  Select audio files or a folder from your device to play immediately offline with zero upload.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
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
            <button type="button" onClick={() => { setSelectedPlaylistId(null); setActiveTab("playlists"); }} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-[#94A3B8] hover:text-[#FF4D80]">Playlists <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="horizontal-rail">
            {playlists.map((playlist) => (
              <HomePlaylistCard
                key={playlist.id}
                playlist={playlist}
                onSelect={() => {
                  setSelectedPlaylistId(playlist.id);
                  setActiveTab("playlists");
                }}
              />
            ))}
          </div>
        </section>
      )}

      {songs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-white">All songs</h2>
            <button type="button" onClick={() => setActiveTab("songs")} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-[#94A3B8] hover:text-[#FF4D80]">Browse all <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E121A]">
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
        <button type="button" onClick={onAction} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-[#94A3B8] hover:text-[#FF4D80]">{action}<ArrowRight className="h-4 w-4" /></button>
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
      <span className="relative block aspect-square overflow-hidden rounded-2xl bg-white/[0.06] border border-white/[0.08]">
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
          <span className="flex h-full items-center justify-center bg-linear-to-br from-[#121c2a] to-[#182333] text-[#FF4D80]">
            <Music2 className="h-8 w-8" />
          </span>
        )}
        <span className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#FF4D80] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </span>
      </span>
      <span className="mt-2 block truncate text-sm font-semibold text-white group-hover:text-[#FF4D80] transition-colors">{song.title}</span>
      <span className="mt-0.5 block truncate text-xs text-[#94A3B8]">{song.artist}</span>
    </button>
  );
}

function DeviceTrackCard({
  song,
  localTracks,
  playSong,
}: {
  song: import("@/types/music").Song;
  localTracks: import("@/types/music").Song[];
  playSong: (song: import("@/types/music").Song, queue?: import("@/types/music").Song[]) => void;
}) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <button
      type="button"
      onClick={() => playSong(song, localTracks)}
      className="group w-36 shrink-0 snap-start text-left sm:w-44"
    >
      <span className="relative block aspect-square overflow-hidden rounded-2xl bg-white/[0.06] border border-emerald-500/20 group-hover:border-emerald-400/50 transition-colors shadow-sm">
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
      <span className="mt-0.5 block truncate text-xs text-[#94A3B8]">
        {song.artist}
      </span>
    </button>
  );
}

function HomePlaylistCard({
  playlist,
  onSelect,
}: {
  playlist: import("@/types/music").Playlist;
  onSelect: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-36 shrink-0 snap-start text-left sm:w-44"
    >
      <span className="relative block aspect-square overflow-hidden rounded-2xl bg-white/[0.06] border border-white/[0.08]">
        {playlist.coverUrl && !imgErr ? (
          <Image
            src={playlist.coverUrl}
            alt=""
            fill
            unoptimized
            className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            onError={() => setImgErr(true)}
          />
        ) : (
          <span className="flex h-full items-center justify-center text-[#64748B]">
            <Disc3 className="h-8 w-8" />
          </span>
        )}
      </span>
      <span className="mt-2 block truncate text-sm font-medium text-white group-hover:text-[#FF4D80] transition-colors">
        {playlist.name}
      </span>
      <span className="mt-0.5 block text-xs text-[#94A3B8]">
        {playlist._count?.songs ?? 0} songs
      </span>
    </button>
  );
}
