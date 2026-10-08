import { create } from "zustand";
import { Song, RepeatMode } from "@/types/music";

function recordPlay(songId: string) {
  void import("@/services/history.service")
    .then(({ historyService }) => historyService.recordPlay(songId))
    .catch((error) => console.warn("Could not record playback history:", error));
}

function shuffleIndices(count: number, startIndex: number): number[] {
  if (count <= 0) return [];
  const pool: number[] = [];
  for (let i = 0; i < count; i++) {
    if (i !== startIndex) pool.push(i);
  }
  // Standard Fisher-Yates uniform shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  if (startIndex >= 0 && startIndex < count) {
    pool.unshift(startIndex);
  }
  return pool;
}

function getInitialPreferences() {
  if (typeof window === "undefined") {
    return { volume: 0.8, isMuted: false, repeatMode: "off" as RepeatMode, isShuffle: false };
  }
  try {
    const volStr = localStorage.getItem("soundify_player_volume");
    const volume = volStr !== null ? Number(volStr) : 0.8;
    const isMuted = localStorage.getItem("soundify_player_muted") === "true";
    const repStr = (localStorage.getItem("soundify_player_repeat") || "off") as RepeatMode;
    const isShuffle = localStorage.getItem("soundify_player_shuffle") === "true";
    return {
      volume: Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0.8,
      isMuted,
      repeatMode: (["off", "all", "one"].includes(repStr) ? repStr : "off") as RepeatMode,
      isShuffle,
    };
  } catch {
    return { volume: 0.8, isMuted: false, repeatMode: "off" as RepeatMode, isShuffle: false };
  }
}

interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  seekTarget: number | null;
  volume: number;
  lastNonZeroVolume: number;
  isMuted: boolean;
  isShuffle: boolean;
  shuffledIndices: number[];
  shufflePosition: number;
  repeatMode: RepeatMode;
  isQueueOpen: boolean;
  isExpandedPlayerOpen: boolean;

  // Actions
  playSong: (song: Song, customQueue?: Song[]) => void;
  playShuffled: (songs: Song[]) => void;
  playQueueItem: (index: number) => void;
  togglePlayPause: () => void;
  pause: () => void;
  resume: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seek: (seconds: number) => void;
  clearSeekTarget: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (song: Song) => void;
  playNextInQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  setQueue: (songs: Song[]) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  toggleQueueOpen: () => void;
  setQueueOpen: (open: boolean) => void;
  toggleExpandedPlayer: () => void;
  setExpandedPlayer: (open: boolean) => void;
}

const initialPrefs = getInitialPreferences();

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  seekTarget: null,
  volume: initialPrefs.volume,
  lastNonZeroVolume: initialPrefs.volume > 0 ? initialPrefs.volume : 0.8,
  isMuted: initialPrefs.isMuted,
  isShuffle: initialPrefs.isShuffle,
  shuffledIndices: [],
  shufflePosition: 0,
  repeatMode: initialPrefs.repeatMode,
  isQueueOpen: false,
  isExpandedPlayerOpen: false,

  playSong: (song: Song, customQueue?: Song[]) => {
    let nextQueue = customQueue ? [...customQueue] : [...get().queue];
    let nextIndex = nextQueue.findIndex((s) => s.id === song.id);

    if (nextIndex === -1) {
      if (nextQueue.length === 0) {
        nextQueue = [song];
        nextIndex = 0;
      } else {
        const curIdx = get().currentIndex;
        const insertAt = curIdx >= 0 ? curIdx + 1 : nextQueue.length;
        nextQueue.splice(insertAt, 0, song);
        nextIndex = insertAt;
      }
    }

    const { isShuffle } = get();
    const newShuffled = isShuffle
      ? shuffleIndices(nextQueue.length, nextIndex)
      : [];

    set({
      currentSong: song,
      queue: nextQueue,
      currentIndex: nextIndex,
      shuffledIndices: newShuffled,
      shufflePosition: 0,
      isPlaying: true,
      currentTime: 0,
      seekTarget: 0,
      duration: song.duration || 0,
    });

    recordPlay(song.id);
  },

  playShuffled: (songs: Song[]) => {
    if (!songs || songs.length === 0) return;
    const startIndex = Math.floor(Math.random() * songs.length);
    const shuffled = shuffleIndices(songs.length, startIndex);
    const startSong = songs[startIndex];
    try {
      localStorage.setItem("soundify_player_shuffle", "true");
    } catch {}
    set({
      queue: songs,
      currentIndex: startIndex,
      currentSong: startSong,
      shuffledIndices: shuffled,
      shufflePosition: 0,
      isShuffle: true,
      isPlaying: true,
      currentTime: 0,
      seekTarget: 0,
      duration: startSong.duration || 0,
    });
    recordPlay(startSong.id);
  },

  playQueueItem: (index: number) => {
    const { queue, isShuffle } = get();
    if (!Number.isInteger(index) || index < 0 || index >= queue.length) return;
    const song = queue[index];
    const newShuffled = isShuffle
      ? shuffleIndices(queue.length, index)
      : [];

    set({
      currentSong: song,
      currentIndex: index,
      shuffledIndices: newShuffled,
      shufflePosition: 0,
      isPlaying: true,
      currentTime: 0,
      seekTarget: 0,
      duration: song.duration || 0,
    });

    recordPlay(song.id);
  },

  togglePlayPause: () => {
    const { isPlaying, currentSong, queue } = get();
    if (!currentSong && queue.length > 0) {
      get().playQueueItem(0);
      return;
    }
    set({ isPlaying: !isPlaying });
  },

  pause: () => set({ isPlaying: false }),
  resume: () => {
    if (get().currentSong) {
      set({ isPlaying: true });
    }
  },

  nextSong: () => {
    const { queue, currentIndex, isShuffle, shuffledIndices, shufflePosition, repeatMode } = get();
    if (queue.length === 0) return;

    if (isShuffle && queue.length > 1) {
      const activeShuffled =
        shuffledIndices.length === queue.length
          ? shuffledIndices
          : shuffleIndices(queue.length, currentIndex);

      if (shufflePosition < activeShuffled.length - 1) {
        const nextPos = shufflePosition + 1;
        const nextIdx = activeShuffled[nextPos];
        const nextSong = queue[nextIdx];
        set({
          shuffledIndices: activeShuffled,
          shufflePosition: nextPos,
          currentIndex: nextIdx,
          currentSong: nextSong,
          currentTime: 0,
          seekTarget: 0,
          isPlaying: true,
          duration: nextSong.duration || 0,
        });
        recordPlay(nextSong.id);
        return;
      }

      if (repeatMode === "all") {
        const reshuffled = shuffleIndices(queue.length, -1);
        const nextIdx = reshuffled[0];
        const nextSong = queue[nextIdx];
        set({
          shuffledIndices: reshuffled,
          shufflePosition: 0,
          currentIndex: nextIdx,
          currentSong: nextSong,
          currentTime: 0,
          seekTarget: 0,
          isPlaying: true,
          duration: nextSong.duration || 0,
        });
        recordPlay(nextSong.id);
        return;
      }

      set({ isPlaying: false, currentTime: 0, seekTarget: 0 });
      return;
    }

    if (currentIndex < queue.length - 1) {
      const nextIdx = currentIndex + 1;
      const nextSong = queue[nextIdx];
      set({
        currentIndex: nextIdx,
        currentSong: nextSong,
        currentTime: 0,
        seekTarget: 0,
        isPlaying: true,
        duration: nextSong.duration || 0,
      });
      recordPlay(nextSong.id);
    } else if (repeatMode === "all") {
      const nextSong = queue[0];
      set({
        currentIndex: 0,
        currentSong: nextSong,
        currentTime: 0,
        seekTarget: 0,
        isPlaying: true,
        duration: nextSong.duration || 0,
      });
      recordPlay(nextSong.id);
    } else {
      set({ isPlaying: false, currentTime: 0, seekTarget: 0 });
    }
  },

  prevSong: () => {
    const { queue, currentIndex, currentTime, isShuffle, shuffledIndices, shufflePosition, repeatMode } = get();
    if (queue.length === 0) return;

    // Per spec: If playback time > 3 seconds, restart current track from beginning
    if (currentTime > 3) {
      set({ currentTime: 0, seekTarget: 0, isPlaying: true });
      return;
    }

    if (isShuffle && queue.length > 1) {
      const activeShuffled =
        shuffledIndices.length === queue.length
          ? shuffledIndices
          : shuffleIndices(queue.length, currentIndex);

      if (shufflePosition > 0) {
        const prevPos = shufflePosition - 1;
        const prevIdx = activeShuffled[prevPos];
        const prevSong = queue[prevIdx];
        set({
          shuffledIndices: activeShuffled,
          shufflePosition: prevPos,
          currentIndex: prevIdx,
          currentSong: prevSong,
          currentTime: 0,
          seekTarget: 0,
          isPlaying: true,
          duration: prevSong.duration || 0,
        });
        recordPlay(prevSong.id);
        return;
      }

      if (repeatMode === "all") {
        const prevPos = activeShuffled.length - 1;
        const prevIdx = activeShuffled[prevPos];
        const prevSong = queue[prevIdx];
        set({
          shuffledIndices: activeShuffled,
          shufflePosition: prevPos,
          currentIndex: prevIdx,
          currentSong: prevSong,
          currentTime: 0,
          seekTarget: 0,
          isPlaying: true,
          duration: prevSong.duration || 0,
        });
        recordPlay(prevSong.id);
        return;
      }

      set({ currentTime: 0, seekTarget: 0 });
      return;
    }

    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      const prevSong = queue[prevIdx];
      set({
        currentIndex: prevIdx,
        currentSong: prevSong,
        currentTime: 0,
        seekTarget: 0,
        isPlaying: true,
        duration: prevSong.duration || 0,
      });
      recordPlay(prevSong.id);
    } else if (repeatMode === "all") {
      const lastIdx = queue.length - 1;
      const lastSong = queue[lastIdx];
      set({
        currentIndex: lastIdx,
        currentSong: lastSong,
        currentTime: 0,
        seekTarget: 0,
        isPlaying: true,
        duration: lastSong.duration || 0,
      });
      recordPlay(lastSong.id);
    } else {
      set({ currentTime: 0, seekTarget: 0 });
    }
  },

  seek: (seconds: number) => {
    if (!Number.isFinite(seconds)) return;
    const duration = get().duration;
    const clamped = Math.max(0, duration > 0 ? Math.min(seconds, duration) : seconds);
    set({ currentTime: clamped, seekTarget: clamped });
  },

  clearSeekTarget: () => set({ seekTarget: null }),

  setVolume: (volume: number) => {
    if (!Number.isFinite(volume)) return;
    const clamped = Math.max(0, Math.min(1, volume));
    set((state) => ({
      volume: clamped,
      lastNonZeroVolume: clamped > 0 ? clamped : state.lastNonZeroVolume,
      isMuted: clamped === 0,
    }));
    try {
      localStorage.setItem("soundify_player_volume", String(clamped));
      localStorage.setItem("soundify_player_muted", clamped === 0 ? "true" : "false");
    } catch {}
  },

  toggleMute: () => {
    set((state) => {
      const newMuted = !state.isMuted && state.volume > 0;
      let newVol = state.volume;
      if (!newMuted) {
        newVol = state.lastNonZeroVolume > 0 ? state.lastNonZeroVolume : 0.8;
      }
      try {
        localStorage.setItem("soundify_player_muted", newMuted ? "true" : "false");
        localStorage.setItem("soundify_player_volume", String(newVol));
      } catch {}
      return { isMuted: newMuted, volume: newVol };
    });
  },

  toggleShuffle: () => {
    set((state) => {
      const nextShuffle = !state.isShuffle;
      const newShuffled = nextShuffle && state.queue.length > 0
        ? shuffleIndices(state.queue.length, state.currentIndex)
        : [];
      try {
        localStorage.setItem("soundify_player_shuffle", nextShuffle ? "true" : "false");
      } catch {}
      return {
        isShuffle: nextShuffle,
        shuffledIndices: newShuffled,
        shufflePosition: 0,
      };
    });
  },

  cycleRepeat: () => {
    const modes: RepeatMode[] = ["off", "all", "one"];
    const current = get().repeatMode;
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    try {
      localStorage.setItem("soundify_player_repeat", next);
    } catch {}
    set({ repeatMode: next });
  },

  addToQueue: (song: Song) => {
    set((state) => {
      const newQueue = [...state.queue, song];
      const curSong = state.currentSong || song;
      const curIdx = state.currentSong ? state.currentIndex : 0;
      const newShuffled = state.isShuffle
        ? shuffleIndices(newQueue.length, curIdx)
        : [];
      return {
        queue: newQueue,
        currentSong: curSong,
        currentIndex: curIdx,
        shuffledIndices: newShuffled,
      };
    });
  },

  playNextInQueue: (song: Song) => {
    set((state) => {
      if (state.queue.length === 0) {
        return {
          queue: [song],
          currentIndex: 0,
          currentSong: song,
          shuffledIndices: [0],
          shufflePosition: 0,
        };
      }
      const newQueue = [...state.queue];
      const insertAt = state.currentIndex >= 0 ? state.currentIndex + 1 : 0;
      newQueue.splice(insertAt, 0, song);
      const newShuffled = state.isShuffle
        ? shuffleIndices(newQueue.length, state.currentIndex)
        : [];
      return { queue: newQueue, shuffledIndices: newShuffled };
    });
  },

  removeFromQueue: (index: number) => {
    set((state) => {
      if (!Number.isInteger(index) || index < 0 || index >= state.queue.length) return state;
      const newQueue = [...state.queue];
      newQueue.splice(index, 1);

      if (newQueue.length === 0) {
        return {
          queue: [],
          currentIndex: -1,
          currentSong: null,
          isPlaying: false,
          currentTime: 0,
          seekTarget: 0,
          duration: 0,
          shuffledIndices: [],
          shufflePosition: 0,
        };
      }

      let newIdx = state.currentIndex;
      let newSong = state.currentSong;

      if (index < state.currentIndex) {
        newIdx = Math.max(0, state.currentIndex - 1);
      } else if (index === state.currentIndex) {
        newIdx = Math.min(index, newQueue.length - 1);
        newSong = newQueue[newIdx];
      }

      const newShuffled = state.isShuffle
        ? shuffleIndices(newQueue.length, newIdx)
        : [];

      return {
        queue: newQueue,
        currentIndex: newIdx,
        currentSong: newSong,
        currentTime: index === state.currentIndex ? 0 : state.currentTime,
        seekTarget: index === state.currentIndex ? 0 : state.seekTarget,
        duration: newSong ? newSong.duration || 0 : 0,
        shuffledIndices: newShuffled,
        shufflePosition: 0,
      };
    });
  },

  reorderQueue: (fromIndex: number, toIndex: number) => {
    set((state) => {
      if (
        fromIndex < 0 ||
        fromIndex >= state.queue.length ||
        toIndex < 0 ||
        toIndex >= state.queue.length ||
        fromIndex === toIndex
      ) {
        return state;
      }
      const newQueue = [...state.queue];
      const [moved] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, moved);

      let newCurrentIndex = state.currentIndex;
      if (state.currentIndex === fromIndex) {
        newCurrentIndex = toIndex;
      } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
        newCurrentIndex = state.currentIndex - 1;
      } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
        newCurrentIndex = state.currentIndex + 1;
      }

      const newShuffled = state.isShuffle
        ? shuffleIndices(newQueue.length, newCurrentIndex)
        : [];

      return {
        queue: newQueue,
        currentIndex: newCurrentIndex,
        shuffledIndices: newShuffled,
      };
    });
  },

  clearQueue: () => {
    set({
      queue: [],
      currentIndex: -1,
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      seekTarget: 0,
      duration: 0,
      shuffledIndices: [],
      shufflePosition: 0,
    });
  },

  setQueue: (songs: Song[]) => {
    set((state) => {
      const newShuffled = state.isShuffle
        ? shuffleIndices(songs.length, state.currentIndex)
        : [];
      return { queue: songs, shuffledIndices: newShuffled };
    });
  },

  setCurrentTime: (time: number) => {
    if (!Number.isFinite(time)) return;
    const duration = get().duration;
    set({ currentTime: Math.max(0, duration > 0 ? Math.min(time, duration) : time) });
  },

  setDuration: (duration: number) => {
    if (!Number.isFinite(duration) || duration < 0) return;
    set((state) => ({
      duration,
      currentTime: duration > 0 ? Math.min(state.currentTime, duration) : state.currentTime,
    }));
  },

  toggleQueueOpen: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
  setQueueOpen: (open: boolean) => set({ isQueueOpen: open }),

  toggleExpandedPlayer: () =>
    set((state) => ({ isExpandedPlayerOpen: !state.isExpandedPlayerOpen })),
  setExpandedPlayer: (open: boolean) => set({ isExpandedPlayerOpen: open }),
}));
