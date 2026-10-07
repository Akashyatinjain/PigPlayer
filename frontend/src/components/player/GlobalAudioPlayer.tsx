"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/lib/store/usePlayerStore";

export default function GlobalAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    currentSong,
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

  // Track whether time update is internal or user-initiated seek
  const isSeekingRef = useRef(false);

  // Synchronize song change
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentSong?.audioUrl) {
      if (audio.src !== currentSong.audioUrl) {
        audio.src = currentSong.audioUrl;
        audio.load();
      }

      if (isPlaying) {
        audio.play().catch((err) => {
          console.warn("Autoplay was blocked or playback interrupted:", err);
        });
      }
    } else {
      audio.pause();
      audio.removeAttribute("src");
    }
  }, [currentSong?.id, currentSong?.audioUrl]);

  // Synchronize play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (isPlaying) {
      if (audio.paused) {
        audio.play().catch((err) => {
          console.warn("Play interrupted or blocked:", err);
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

  // MediaSession API integration
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    if (currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album || "Soundify",
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
      // Ignore keystrokes when user is typing in inputs or textareas
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
      preload="metadata"
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
      onError={(e) => {
        console.error("Audio playback error:", e);
      }}
    />
  );
}
