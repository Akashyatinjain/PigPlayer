"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/lib/store/usePlayerStore";
import { offlineStorageService } from "@/services/offline-storage.service";
import { resolveMediaUrl } from "@/services/song.service";
import { getApiOrigin } from "@/lib/api";

export default function GlobalAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedSongIdRef = useRef<string | null>(null);
  const hasRecordedHistoryRef = useRef(false);
  const accumulatedPlayTimeRef = useRef(0);
  const lastPlayTimeRef = useRef(0);

  const currentSong = usePlayerStore((s) => s.currentSong);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const seekTarget = usePlayerStore((s) => s.seekTarget);

  const nextSong = usePlayerStore((s) => s.nextSong);
  const prevSong = usePlayerStore((s) => s.prevSong);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const seek = usePlayerStore((s) => s.seek);
  const clearSeekTarget = usePlayerStore((s) => s.clearSeekTarget);

  const currentSongRef = useRef(currentSong);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    currentSongRef.current = currentSong;
    isPlayingRef.current = isPlaying;
  });

  const recordPlayHistory = useCallback((songId: string) => {
    if (!hasRecordedHistoryRef.current && songId) {
      hasRecordedHistoryRef.current = true;
      void import("@/services/history.service")
        .then(({ historyService }) => historyService.recordPlay(songId))
        .catch(() => {});
    }
  }, []);

  /**
   * Seamless server-shutdown / network drop recovery:
   * Swaps audio element src to local IndexedDB blob at the exact preserved timestamp.
   */
  const handleRecoverFromCache = useCallback(async () => {
    const audio = audioRef.current;
    const song = currentSongRef.current;
    if (!audio || !song) return;

    const savedTime = audio.currentTime;
    try {
      const cachedBlobUrl = await offlineStorageService.getOfflineAudioUrl(song.id);
      if (cachedBlobUrl && audio.src !== cachedBlobUrl) {
        audio.src = cachedBlobUrl;
        audio.currentTime = savedTime;
        if (isPlayingRef.current) {
          audio.play().catch(() => {});
        }
      }
    } catch (err) {
      console.warn("[Soundify] Recovery from cache attempt:", err);
    }
  }, []);

  // Synchronize song change with cache-first and background buffering
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let isCancelled = false;
    const song = currentSong;

    if (song) {
      hasRecordedHistoryRef.current = false;
      accumulatedPlayTimeRef.current = 0;
      lastPlayTimeRef.current = 0;

      // If same song is already loaded, avoid resetting buffer and time
      if (loadedSongIdRef.current === song.id && audio.src) {
        return;
      }

      loadedSongIdRef.current = song.id;
      const streamingUrl = resolveMediaUrl(song.audioUrl);

      if (audio.src !== streamingUrl) {
        audio.src = streamingUrl;
        audio.load();
      }

      // Check if an offline version is stored locally
      void offlineStorageService.getOfflineAudioUrl(song.id).then((cachedBlobUrl) => {
        if (isCancelled || !audio) return;
        if (cachedBlobUrl && audio.src !== cachedBlobUrl) {
          if (
            audio.error ||
            (typeof navigator !== "undefined" && !navigator.onLine) ||
            song.id.startsWith("local-") ||
            song.isOfflineAvailable
          ) {
            const savedTime = audio.currentTime || 0;
            audio.src = cachedBlobUrl;
            audio.currentTime = savedTime;
            if (isPlayingRef.current) {
              audio.play().catch(() => {});
            }
          }
        }
      });

      // In background: cache the current track for offline playback
      void offlineStorageService.cacheSongForPlayback(song).then((blobUrl) => {
        if (blobUrl && audioRef.current && audioRef.current.error) {
          void handleRecoverFromCache();
        }
      });
    } else {
      loadedSongIdRef.current = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    return () => {
      isCancelled = true;
    };
  }, [currentSong?.id, currentSong?.audioUrl, handleRecoverFromCache]);

  // Queue changes should preload independently
  useEffect(() => {
    const nextTrack = queue[currentIndex + 1] || (repeatMode === "all" ? queue[0] : null);
    if (nextTrack) void offlineStorageService.preloadSong(nextTrack);
  }, [queue, currentIndex, repeatMode]);

  // Synchronize play/pause state independently without reloading audio source
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (isPlaying) {
      if (audio.paused) {
        audio.play().catch((err) => {
          console.warn("[Soundify] Play interrupted or blocked:", err);
        });
      }
    } else {
      if (!audio.paused) {
        audio.pause();
      }
    }
  }, [isPlaying, currentSong?.id]);

  // Synchronize volume and mute
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

  // Millisecond-accurate user seek (eliminates deadzones)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || seekTarget === null) return;
    try {
      audio.currentTime = seekTarget;
    } catch {
      // Audio may still be buffering metadata
    }
    clearSeekTarget();
  }, [seekTarget, clearSeekTarget]);

  // Render Keep-Alive Heartbeat: keep free tier awake while player tab is open
  useEffect(() => {
    const pingKeepAlive = () => {
      const origin = getApiOrigin();
      fetch(`${origin}/health`, { method: "GET", keepalive: true }).catch(() => {});
    };

    pingKeepAlive();
    const interval = setInterval(pingKeepAlive, 3.5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // MediaSession API integration for native notification controls & mobile lock screen
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    if (currentSong) {
      const defaultLogo = typeof window !== "undefined"
        ? new URL("/piggy-logo.jpg", window.location.origin).href
        : "/piggy-logo.jpg";

      const artworkUrl = currentSong.coverUrl
        ? (currentSong.coverUrl.startsWith("http") || currentSong.coverUrl.startsWith("blob:")
            ? currentSong.coverUrl
            : new URL(currentSong.coverUrl, window.location.origin).href)
        : defaultLogo;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album || "piGGyPlayer",
        artwork: [
          { src: artworkUrl, sizes: "96x96", type: "image/jpeg" },
          { src: artworkUrl, sizes: "128x128", type: "image/jpeg" },
          { src: artworkUrl, sizes: "192x192", type: "image/jpeg" },
          { src: artworkUrl, sizes: "256x256", type: "image/jpeg" },
          { src: artworkUrl, sizes: "384x384", type: "image/jpeg" },
          { src: artworkUrl, sizes: "512x512", type: "image/jpeg" },
        ],
      });

      // Synchronize notification bar play/pause state
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

      // Native action handlers
      navigator.mediaSession.setActionHandler("play", () => togglePlayPause());
      navigator.mediaSession.setActionHandler("pause", () => togglePlayPause());
      navigator.mediaSession.setActionHandler("previoustrack", () => prevSong());
      navigator.mediaSession.setActionHandler("nexttrack", () => nextSong());
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        const offset = details.seekOffset || 10;
        const audio = audioRef.current;
        if (audio) seek(Math.max(audio.currentTime - offset, 0));
      });
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        const offset = details.seekOffset || 10;
        const audio = audioRef.current;
        if (audio) seek(Math.min(audio.currentTime + offset, audio.duration || 0));
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      });

      // Status Bar Notification
      if ("Notification" in window) {
        const showNotif = () => {
          try {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(currentSong.title, {
                  body: `${currentSong.artist}${currentSong.album ? ` • ${currentSong.album}` : ""}`,
                  icon: artworkUrl,
                  badge: defaultLogo,
                  tag: "soundify-now-playing",
                  silent: true,
                }).catch(() => {});
              }).catch(() => {});
            } else {
              new Notification(currentSong.title, {
                body: `${currentSong.artist}${currentSong.album ? ` • ${currentSong.album}` : ""}`,
                icon: artworkUrl,
                tag: "soundify-now-playing",
                silent: true,
              });
            }
          } catch {}
        };

        if (Notification.permission === "granted") {
          showNotif();
        } else if (Notification.permission === "default") {
          Notification.requestPermission().then((p) => {
            if (p === "granted") showNotif();
          }).catch(() => {});
        }
      }
    }
  }, [currentSong, isPlaying, togglePlayPause, prevSong, nextSong, seek]);

  // Global Keyboard Shortcuts (uses getState to prevent listener rebuild churn)
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

      const store = usePlayerStore.getState();

      switch (e.code) {
        case "Space":
          e.preventDefault();
          store.togglePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          store.seek(Math.max(0, store.currentTime - 5));
          break;
        case "ArrowRight":
          e.preventDefault();
          store.seek(store.currentTime + 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          store.setVolume(Math.min(1, store.volume + 0.05));
          break;
        case "ArrowDown":
          e.preventDefault();
          store.setVolume(Math.max(0, store.volume - 0.05));
          break;
        case "KeyM":
          store.toggleMute();
          break;
        case "KeyN":
          store.nextSong();
          break;
        case "KeyP":
          store.prevSong();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <audio
      ref={audioRef}
      id="soundify-audio-element"
      preload="auto"
      onTimeUpdate={() => {
        const audio = audioRef.current;
        if (!audio) return;
        setCurrentTime(audio.currentTime);

        // Synchronize notification seekbar position
        if ("mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
          const dur = audio.duration;
          if (!isNaN(dur) && dur > 0) {
            try {
              navigator.mediaSession.setPositionState({
                duration: dur,
                playbackRate: audio.playbackRate || 1,
                position: Math.min(audio.currentTime, dur),
              });
            } catch {}
          }
        }

        // Accumulate listening duration for meaningful history recording (at least 5s)
        const now = audio.currentTime;
        if (now > lastPlayTimeRef.current && now - lastPlayTimeRef.current < 2) {
          accumulatedPlayTimeRef.current += now - lastPlayTimeRef.current;
        }
        lastPlayTimeRef.current = now;

        if (accumulatedPlayTimeRef.current >= 5 && currentSongRef.current) {
          recordPlayHistory(currentSongRef.current.id);
        }
      }}
      onDurationChange={() => {
        if (!audioRef.current) return;
        const dur = audioRef.current.duration;
        if (!isNaN(dur) && dur > 0) {
          setDuration(dur);
        }
      }}
      onEnded={() => {
        if (currentSongRef.current) {
          recordPlayHistory(currentSongRef.current.id);
        }

        if (repeatMode === "one") {
          const audio = audioRef.current;
          if (audio) {
            audio.currentTime = 0;
            setCurrentTime(0);
            audio.play().catch(() => {});
          }
        } else {
          nextSong();
        }
      }}
      onStalled={() => {
        void handleRecoverFromCache();
      }}
      onError={() => {
        void handleRecoverFromCache();
      }}
    />
  );
}
