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
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const currentSong = usePlayerStore((s) => s.currentSong);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const seekTarget = usePlayerStore((s) => s.seekTarget);

  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
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

      // If same song is already loaded, avoid resetting buffer and time unless restarting
      if (loadedSongIdRef.current === song.id && audio.src) {
        if (audio.ended || (isPlayingRef.current && audio.paused)) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }
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
  }, [currentSong, handleRecoverFromCache]);

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
        const promise = audio.play();
        playPromiseRef.current = promise;
        promise
          .catch((err) => {
            if (err.name !== "AbortError") {
              console.warn("[Soundify] Play blocked or failed:", err);
            }
            if (isPlayingRef.current) {
              usePlayerStore.setState({ isPlaying: false });
            }
          })
          .finally(() => {
            if (playPromiseRef.current === promise) {
              playPromiseRef.current = null;
            }
          });
      }
    } else {
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            if (!isPlayingRef.current && audio && !audio.paused) {
              audio.pause();
            }
          })
          .catch(() => {});
      } else if (!audio.paused) {
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

      // Native action handlers for Android Notification Drawer & iOS Lock Screen
      try {
        navigator.mediaSession.setActionHandler("play", async () => {
          const audio = audioRef.current;
          if (audio && audio.paused) {
            try { await audio.play(); } catch {}
          }
          usePlayerStore.getState().resume();
        });

        navigator.mediaSession.setActionHandler("pause", () => {
          const audio = audioRef.current;
          if (audio && !audio.paused) {
            audio.pause();
          }
          usePlayerStore.getState().pause();
        });

        navigator.mediaSession.setActionHandler("previoustrack", () => {
          usePlayerStore.getState().prevSong();
        });

        navigator.mediaSession.setActionHandler("nexttrack", () => {
          usePlayerStore.getState().nextSong();
        });

        navigator.mediaSession.setActionHandler("seekto", (details) => {
          if (details.seekTime !== undefined) {
            const audio = audioRef.current;
            if (audio) audio.currentTime = details.seekTime;
            usePlayerStore.getState().seek(details.seekTime);
          }
        });

        navigator.mediaSession.setActionHandler("seekbackward", (details) => {
          const offset = details.seekOffset || 10;
          const audio = audioRef.current;
          if (audio) {
            const newTime = Math.max(0, audio.currentTime - offset);
            audio.currentTime = newTime;
            usePlayerStore.getState().seek(newTime);
          }
        });

        navigator.mediaSession.setActionHandler("seekforward", (details) => {
          const offset = details.seekOffset || 10;
          const audio = audioRef.current;
          if (audio) {
            const newTime = Math.min(audio.duration || 0, audio.currentTime + offset);
            audio.currentTime = newTime;
            usePlayerStore.getState().seek(newTime);
          }
        });

        navigator.mediaSession.setActionHandler("stop", () => {
          const audio = audioRef.current;
          if (audio) {
            audio.pause();
            audio.currentTime = 0;
          }
          usePlayerStore.getState().pause();
        });
      } catch (err) {
        console.warn("[piGGyPlayer] mediaSession action registration:", err);
      }
    } else {
      navigator.mediaSession.playbackState = "none";
    }
  }, [currentSong, isPlaying]);

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
      onPlay={() => {
        if (typeof window !== "undefined" && "mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
        }
        if (!usePlayerStore.getState().isPlaying) {
          usePlayerStore.setState({ isPlaying: true });
        }
      }}
      onPause={() => {
        if (typeof window !== "undefined" && "mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }
        if (usePlayerStore.getState().isPlaying) {
          usePlayerStore.setState({ isPlaying: false });
        }
      }}
      onLoadedMetadata={() => {
        const audio = audioRef.current;
        if (!audio) return;
        const dur = audio.duration;
        if (Number.isFinite(dur) && dur > 0) {
          setDuration(dur);
          if (typeof window !== "undefined" && "mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
            try {
              navigator.mediaSession.setPositionState({
                duration: dur,
                playbackRate: audio.playbackRate || 1,
                position: audio.currentTime || 0,
              });
            } catch {}
          }
        }
      }}
      onSeeked={() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (typeof window !== "undefined" && "mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
          const dur = audio.duration;
          if (Number.isFinite(dur) && dur > 0) {
            try {
              navigator.mediaSession.setPositionState({
                duration: dur,
                playbackRate: audio.playbackRate || 1,
                position: Math.min(audio.currentTime, dur),
              });
            } catch {}
          }
        }
      }}
      onTimeUpdate={() => {
        const audio = audioRef.current;
        if (!audio) return;
        setCurrentTime(audio.currentTime);

        // Synchronize notification seekbar position
        if (typeof window !== "undefined" && "mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
          const dur = audio.duration;
          if (Number.isFinite(dur) && dur > 0) {
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
        const audio = audioRef.current;
        if (!audio) return;
        const dur = audio.duration;
        if (Number.isFinite(dur) && dur > 0) {
          setDuration(dur);
          if (typeof window !== "undefined" && "mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
            try {
              navigator.mediaSession.setPositionState({
                duration: dur,
                playbackRate: audio.playbackRate || 1,
                position: Math.min(audio.currentTime, dur),
              });
            } catch {}
          }
        }
      }}
      onEnded={() => {
        if (currentSongRef.current) {
          recordPlayHistory(currentSongRef.current.id);
        }

        const state = usePlayerStore.getState();
        if (state.repeatMode === "one" || (state.repeatMode === "all" && state.queue.length <= 1)) {
          const audio = audioRef.current;
          if (audio) {
            audio.currentTime = 0;
            setCurrentTime(0);
            audio.play().catch(() => {});
          }
        } else {
          state.nextSong();
        }
      }}
      onStalled={() => {
        void handleRecoverFromCache();
      }}
      onError={() => {
        if (isPlayingRef.current) {
          usePlayerStore.setState({ isPlaying: false });
        }
        void handleRecoverFromCache();
      }}
    />
  );
}
