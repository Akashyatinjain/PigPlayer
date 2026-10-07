import { create } from "zustand";
import { Song, RepeatMode } from "@/types/music";

interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isQueueOpen: boolean;
  isExpandedPlayerOpen: boolean;

  // Actions
  playSong: (song: Song, customQueue?: Song[]) => void;
  togglePlayPause: () => void;
  pause: () => void;
  resume: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (song: Song) => void;
  playNextInQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setQueue: (songs: Song[]) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  toggleQueueOpen: () => void;
  setQueueOpen: (open: boolean) => void;
  toggleExpandedPlayer: () => void;
  setExpandedPlayer: (open: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  isShuffle: false,
  repeatMode: "off",
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
        // Insert right after current song or at end
        const insertAt = curIdx >= 0 ? curIdx + 1 : nextQueue.length;
        nextQueue.splice(insertAt, 0, song);
        nextIndex = insertAt;
      }
    }

    set({
      currentSong: song,
      queue: nextQueue,
      currentIndex: nextIndex,
      isPlaying: true,
      currentTime: 0,
      duration: song.duration || 0,
    });

    // Record play history asynchronously via history service
    import('@/services/history.service').then(({ historyService }) => {
      historyService.recordPlay(song.id).catch(() => {});
    }).catch(() => {});
  },

  togglePlayPause: () => {
    const { isPlaying, currentSong, queue } = get();
    if (!currentSong && queue.length > 0) {
      get().playSong(queue[0]);
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
    const { queue, currentIndex, isShuffle, repeatMode } = get();
    if (queue.length === 0) return;

    if (repeatMode === "one") {
      set({ currentTime: 0, isPlaying: true });
      return;
    }

    if (isShuffle && queue.length > 1) {
      let randomIndex = Math.floor(Math.random() * queue.length);
      while (randomIndex === currentIndex && queue.length > 1) {
        randomIndex = Math.floor(Math.random() * queue.length);
      }
      const nextSong = queue[randomIndex];
      set({
        currentIndex: randomIndex,
        currentSong: nextSong,
        currentTime: 0,
        isPlaying: true,
      });
      return;
    }

    if (currentIndex < queue.length - 1) {
      const nextIdx = currentIndex + 1;
      set({
        currentIndex: nextIdx,
        currentSong: queue[nextIdx],
        currentTime: 0,
        isPlaying: true,
      });
    } else if (repeatMode === "all") {
      set({
        currentIndex: 0,
        currentSong: queue[0],
        currentTime: 0,
        isPlaying: true,
      });
    } else {
      set({ isPlaying: false, currentTime: 0 });
    }
  },

  prevSong: () => {
    const { queue, currentIndex, currentTime, repeatMode } = get();
    if (queue.length === 0) return;

    // If current song is already playing past 3 seconds, reset to beginning
    if (currentTime > 3) {
      set({ currentTime: 0, isPlaying: true });
      return;
    }

    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      set({
        currentIndex: prevIdx,
        currentSong: queue[prevIdx],
        currentTime: 0,
        isPlaying: true,
      });
    } else if (repeatMode === "all") {
      const lastIdx = queue.length - 1;
      set({
        currentIndex: lastIdx,
        currentSong: queue[lastIdx],
        currentTime: 0,
        isPlaying: true,
      });
    } else {
      set({ currentTime: 0 });
    }
  },

  seek: (seconds: number) => {
    set({ currentTime: Math.max(0, seconds) });
  },

  setVolume: (volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    set((state) => ({ isMuted: !state.isMuted }));
  },

  toggleShuffle: () => {
    set((state) => ({ isShuffle: !state.isShuffle }));
  },

  cycleRepeat: () => {
    const modes: RepeatMode[] = ["off", "all", "one"];
    const current = get().repeatMode;
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    set({ repeatMode: next });
  },

  addToQueue: (song: Song) => {
    set((state) => ({
      queue: [...state.queue, song],
    }));
  },

  playNextInQueue: (song: Song) => {
    set((state) => {
      const newQueue = [...state.queue];
      const insertAt = state.currentIndex >= 0 ? state.currentIndex + 1 : 0;
      newQueue.splice(insertAt, 0, song);
      return { queue: newQueue };
    });
  },

  removeFromQueue: (index: number) => {
    set((state) => {
      const newQueue = [...state.queue];
      newQueue.splice(index, 1);
      let newIdx = state.currentIndex;
      if (index < state.currentIndex) {
        newIdx = Math.max(0, state.currentIndex - 1);
      } else if (index === state.currentIndex) {
        if (newQueue.length === 0) {
          return { queue: [], currentIndex: -1, currentSong: null, isPlaying: false };
        }
        newIdx = Math.min(index, newQueue.length - 1);
        return {
          queue: newQueue,
          currentIndex: newIdx,
          currentSong: newQueue[newIdx],
          currentTime: 0,
        };
      }
      return { queue: newQueue, currentIndex: newIdx };
    });
  },

  clearQueue: () => {
    set({
      queue: [],
      currentIndex: -1,
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
    });
  },

  setQueue: (songs: Song[]) => {
    set({ queue: songs });
  },

  setCurrentTime: (time: number) => set({ currentTime: time }),
  setDuration: (duration: number) => set({ duration }),

  toggleQueueOpen: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
  setQueueOpen: (open: boolean) => set({ isQueueOpen: open }),

  toggleExpandedPlayer: () =>
    set((state) => ({ isExpandedPlayerOpen: !state.isExpandedPlayerOpen })),
  setExpandedPlayer: (open: boolean) => set({ isExpandedPlayerOpen: open }),
}));
