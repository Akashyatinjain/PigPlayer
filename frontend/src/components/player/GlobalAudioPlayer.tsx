"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { offlineStorageService } from "@/services/offline-storage.service";
import { resolveMediaUrl } from "@/services/song.service";
import { getApiOrigin } from "@/lib/api";

export default function GlobalAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedSongIdRef = useRef<string | null>(null);
  const isSeekingRef = useRef(false);

  const {
    currentSong,
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    volume,
    isMuted,
    repeatMode,
    nextSong,
    prevSong,
    togglePlayPause,
    setCurrentTime,
    setDuration,
    seek,
    setVolume,
    toggleMute,
  } = usePlayerStore();

  /**
   * Seamless server-shutdown / network drop recovery:
   * Swaps audio element src to local IndexedDB blob at the exact preserved timestamp.
   */
  const handleRecoverFromCache = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    const savedTime = audio.currentTime;
    try {
      const cachedBlobUrl = await offlineStorageService.getOfflineAudioUrl(currentSong.id);
      if (cachedBlobUrl && audio.src !== cachedBlobUrl) {
        console.info(`[PigPlayer] Recovered playback from local cache at ${savedTime.toFixed(1)}s`);
        audio.src = cachedBlobUrl;
        audio.currentTime = savedTime;
        if (isPlaying) {
          audio.play().catch(() => {});
        }
      }
    } catch (err) {
      console.warn("[PigPlayer] Recovery from cache attempt:", err);
    }
  }, [currentSong, isPlaying]);

  // Synchronize song change with cache-first and background buffering
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let isCancelled = false;

    if (currentSong) {
      // If same song is already loaded, avoid resetting buffer and time
      if (loadedSongIdRef.current === currentSong.id && audio.src) {
        return;
      }

      loadedSongIdRef.current = currentSong.id;

      const streamingUrl = resolveMediaUrl(currentSong.audioUrl);

      // Set audio source synchronously so mobile user-gesture is preserved
      if (audio.src !== streamingUrl) {
        audio.src = streamingUrl;
        audio.load();
      }

      if (isPlaying) {
        audio.play().catch((err) => {
          console.warn("[PigPlayer] Autoplay prevented or interrupted:", err);
        });
      }

      // 1. Check if an offline version is stored locally (especially if offline or network drops)
      void offlineStorageService.getOfflineAudioUrl(currentSong.id).then((cachedBlobUrl) => {
        if (isCancelled || !audio) return;
        if (cachedBlobUrl && audio.src !== cachedBlobUrl) {
          // If browser encountered error or device is offline, switch immediately to blob
          if (audio.error || (typeof navigator !== "undefined" && !navigator.onLine)) {
            const savedTime = audio.currentTime || 0;
            audio.src = cachedBlobUrl;
            audio.currentTime = savedTime;
            if (isPlaying) {
              audio.play().catch(() => {});
            }
          }
        }
      });

      // 2. In background: cache the current track for offline playback
      void offlineStorageService.cacheSongForPlayback(currentSong).then((blobUrl) => {
        if (blobUrl && audioRef.current && audioRef.current.error) {
          void handleRecoverFromCache();
        }
      });

      // 3. In background: preload next track in queue
      const nextTrack = queue[currentIndex + 1] || (repeatMode === "all" ? queue[0] : null);
      if (nextTrack) {
        void offlineStorageService.preloadSong(nextTrack);
      }
    } else {
      loadedSongIdRef.current = null;
      audio.pause();
      audio.removeAttribute("src");
    }

    return () => {
      isCancelled = true;
    };
  }, [currentSong?.id, queue, currentIndex, repeatMode, handleRecoverFromCache]);

  // Synchronize play/pause state independently without reloading audio source
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (isPlaying) {
      if (audio.paused) {
        audio.play().catch((err) => {
          console.warn("[PigPlayer] Play interrupted or blocked:", err);
        });
      }
    } else {
      if (!audio.paused) {
        audio.pause();
      }
    }
  }, [isPlaying, currentSong]);

  // Synchronize volume and mute
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

  // Synchronize user seek
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Math.abs(audio.currentTime - currentTime) > 1.2) {
      audio.currentTime = currentTime;
    }
  }, [currentTime]);

  // Render Keep-Alive Heartbeat: keep free tier awake while player tab is open
  useEffect(() => {
    const pingKeepAlive = () => {
      const origin = getApiOrigin();
      fetch(`${origin}/health`, { method: "GET", keepalive: true }).catch(() => {});
    };

    pingKeepAlive();
    const interval = setInterval(pingKeepAlive, 3.5 * 60 * 1000); // every 3.5 mins
    return () => clearInterval(interval);
  }, []);

  // MediaSession API integration for native notification controls
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    if (currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album || "piGGyPlayer",
        artwork: currentSong.coverUrl
          ? [
              { src: currentSong.coverUrl, sizes: "96x96", type: "image/png" },
              { src: currentSong.coverUrl, sizes: "192x192", type: "image/png" },
              { src: currentSong.coverUrl, sizes: "512x512", type: "image/png" },
            ]
          : [],
      });

      navigator.mediaSession.setActionHandler("play", () => togglePlayPause());
      navigator.mediaSession.setActionHandler("pause", () => togglePlayPause());
      navigator.mediaSession.setActionHandler("previoustrack", () => prevSong());
      navigator.mediaSession.setActionHandler("nexttrack", () => nextSong());
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      });
    }
  }, [currentSong, togglePlayPause, prevSong, nextSong, seek]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(Math.max(0, currentTime - 5));
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(currentTime + 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.05));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.05));
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyN":
          nextSong();
          break;
        case "KeyP":
          prevSong();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, seek, currentTime, setVolume, volume, toggleMute, nextSong, prevSong]);

  return (
    <audio
      ref={audioRef}
      id="soundify-audio-element"
      preload="auto"
      onTimeUpdate={() => {
        if (!audioRef.current || isSeekingRef.current) return;
        setCurrentTime(audioRef.current.currentTime);
      }}
      onDurationChange={() => {
        if (!audioRef.current) return;
        const dur = audioRef.current.duration;
        if (!isNaN(dur) && dur > 0) {
          setDuration(dur);
        }
      }}
      onEnded={() => {
        if (repeatMode === "one") {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
        } else {
          nextSong();
        }
      }}
      onStalled={() => {
        console.warn("[PigPlayer] Stream stalled, verifying cache availability...");
        void handleRecoverFromCache();
      }}
      onError={(e) => {
        console.warn("[PigPlayer] Audio network error encountered, activating local cache fallback...", e);
        void handleRecoverFromCache();
      }}
    />
  );
}
