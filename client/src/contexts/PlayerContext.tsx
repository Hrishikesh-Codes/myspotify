import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { TrackItem } from "@/types/api";

interface PlayerState {
  currentTrack: TrackItem | null;
  queue: TrackItem[];
  queueIndex: number;
  isPlaying: boolean;
  progress: number;   // 0-100
  currentTime: number; // seconds
  duration: number;   // seconds
  volume: number;     // 0-100
}

interface PlayerContextValue extends PlayerState {
  play: (track: TrackItem, queue?: TrackItem[]) => void;
  pause: () => void;
  resume: () => void;
  seek: (percent: number) => void;
  setVolume: (v: number) => void;
  skipNext: () => void;
  skipPrev: () => void;
}

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    queue: [],
    queueIndex: 0,
    isPlaying: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    volume: 75,
  });

  // Sync audio volume on mount and when volume changes
  useEffect(() => {
    audioRef.current.volume = state.volume / 100;
  }, [state.volume]);

  // Wire up audio event listeners once
  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => {
      const d = audio.duration || 0;
      const t = audio.currentTime;
      setState((s) => ({
        ...s,
        currentTime: t,
        duration: d,
        progress: d ? (t / d) * 100 : 0,
      }));
    };

    const onEnded = () => {
      setState((s) => {
        const nextIndex = s.queueIndex + 1;
        if (nextIndex < s.queue.length) {
          const next = s.queue[nextIndex];
          if (next.previewUrl) {
            audio.src = next.previewUrl;
            audio.play().catch(() => {});
          }
          return { ...s, currentTrack: next, queueIndex: nextIndex, isPlaying: !!next.previewUrl, progress: 0, currentTime: 0 };
        }
        return { ...s, isPlaying: false, progress: 0, currentTime: 0 };
      });
    };

    const onLoadedMetadata = () => {
      setState((s) => ({ ...s, duration: audio.duration }));
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.pause();
    };
  }, []);

  const play = useCallback((track: TrackItem, queue?: TrackItem[]) => {
    const audio = audioRef.current;
    const newQueue = queue ?? [track];
    const idx = newQueue.findIndex((t) => t.id === track.id);

    if (track.previewUrl) {
      audio.src = track.previewUrl;
      audio.volume = state.volume / 100;
      audio.play().catch(() => {});
      setState((s) => ({
        ...s,
        currentTrack: track,
        queue: newQueue,
        queueIndex: idx >= 0 ? idx : 0,
        isPlaying: true,
        progress: 0,
        currentTime: 0,
      }));
    } else {
      // No preview — still update UI but don't play audio
      audio.pause();
      setState((s) => ({
        ...s,
        currentTrack: track,
        queue: newQueue,
        queueIndex: idx >= 0 ? idx : 0,
        isPlaying: false,
        progress: 0,
        currentTime: 0,
      }));
    }
  }, [state.volume]);

  const pause = useCallback(() => {
    audioRef.current.pause();
    setState((s) => ({ ...s, isPlaying: false }));
  }, []);

  const resume = useCallback(() => {
    if (state.currentTrack?.previewUrl) {
      audioRef.current.play().catch(() => {});
      setState((s) => ({ ...s, isPlaying: true }));
    }
  }, [state.currentTrack]);

  const seek = useCallback((percent: number) => {
    const audio = audioRef.current;
    if (audio.duration) {
      audio.currentTime = (percent / 100) * audio.duration;
      setState((s) => ({ ...s, progress: percent }));
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    audioRef.current.volume = v / 100;
    setState((s) => ({ ...s, volume: v }));
  }, []);

  const skipNext = useCallback(() => {
    setState((s) => {
      const next = s.queueIndex + 1;
      if (next >= s.queue.length) return s;
      const track = s.queue[next];
      const audio = audioRef.current;
      if (track.previewUrl) {
        audio.src = track.previewUrl;
        audio.play().catch(() => {});
      }
      return { ...s, currentTrack: track, queueIndex: next, isPlaying: !!track.previewUrl, progress: 0, currentTime: 0 };
    });
  }, []);

  const skipPrev = useCallback(() => {
    setState((s) => {
      // If >3 sec in, restart current; otherwise go back
      const audio = audioRef.current;
      if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return { ...s, progress: 0, currentTime: 0 };
      }
      const prev = s.queueIndex - 1;
      if (prev < 0) return s;
      const track = s.queue[prev];
      if (track.previewUrl) {
        audio.src = track.previewUrl;
        audio.play().catch(() => {});
      }
      return { ...s, currentTrack: track, queueIndex: prev, isPlaying: !!track.previewUrl, progress: 0, currentTime: 0 };
    });
  }, []);

  return (
    <PlayerContext.Provider
      value={{ ...state, play, pause, resume, seek, setVolume, skipNext, skipPrev }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
