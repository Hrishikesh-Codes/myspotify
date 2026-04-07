import { usePlayer } from "@/contexts/PlayerContext";
import { fmtDuration } from "@/lib/api";

function fmt(secs: number) {
  return fmtDuration(Math.round(secs) * 1000);
}

export default function PlayerBar() {
  const { currentTrack, isPlaying, progress, currentTime, duration, volume, pause, resume, seek, setVolume, skipNext, skipPrev } = usePlayer();

  const toggle = () => (isPlaying ? pause() : resume());

  return (
    <footer className="h-[72px] bg-surface border-t border-border flex items-center px-4 gap-4 shrink-0">
      {/* Track info */}
      <div className="flex items-center gap-3 w-[220px] min-w-0">
        {currentTrack ? (
          <>
            <img
              src={currentTrack.albumArt}
              alt={currentTrack.albumName}
              className="w-12 h-12 rounded-lg object-cover shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{currentTrack.name}</p>
              <p className="text-xs text-text-tertiary truncate">
                {currentTrack.artists.map((a) => a.name).join(", ")}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 text-text-tertiary">
            <div className="w-12 h-12 rounded-lg bg-elevated shrink-0 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <span className="text-xs">Nothing playing</span>
          </div>
        )}
      </div>

      {/* Center controls */}
      <div className="flex-1 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-5">
          <button
            onClick={skipPrev}
            disabled={!currentTrack}
            className="text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40"
          >
            <PrevIcon />
          </button>

          {/* Play/pause */}
          <button
            onClick={toggle}
            disabled={!currentTrack}
            className="play-btn w-9 h-9 disabled:opacity-40"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            onClick={skipNext}
            disabled={!currentTrack}
            className="text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40"
          >
            <NextIcon />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 w-full max-w-md">
          <span className="text-[10px] text-text-tertiary tabular-nums w-8 text-right">
            {currentTrack ? fmt(currentTime) : "0:00"}
          </span>
          <div className="relative flex-1 h-1 group">
            <div className="absolute inset-0 bg-elevated rounded-full" />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent-pink rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            {/* Glow dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary-glow rounded-full shadow-[0_0_8px_rgba(167,139,250,0.8)] opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => seek(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              disabled={!currentTrack}
            />
          </div>
          <span className="text-[10px] text-text-tertiary tabular-nums w-8">
            {currentTrack ? (duration ? fmt(duration) : "0:30") : "0:00"}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div className="hidden sm:flex items-center gap-2 w-[160px] justify-end">
        <button className="text-text-tertiary hover:text-text-primary transition-colors">
          <VolumeIcon muted={volume === 0} />
        </button>
        <div className="relative w-24 h-1 group">
          <div className="absolute inset-0 bg-elevated rounded-full" />
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent-pink rounded-full"
            style={{ width: `${volume}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-primary-glow rounded-full shadow-[0_0_6px_rgba(167,139,250,0.7)] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${volume}% - 5px)` }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </footer>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}
function PrevIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
    </svg>
  );
}
function NextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  );
}
function VolumeIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}
