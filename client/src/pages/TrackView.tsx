import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, getDominantMood, fmtDuration } from "@/lib/api";
import { usePlayer } from "@/contexts/PlayerContext";
import type { SpotifyTrackRaw, AudioFeatures } from "@/types/api";

const FEATURE_BARS: { key: keyof AudioFeatures; label: string }[] = [
  { key: "danceability", label: "Danceability" },
  { key: "energy", label: "Energy" },
  { key: "valence", label: "Positivity" },
  { key: "acousticness", label: "Acousticness" },
  { key: "instrumentalness", label: "Instrumentalness" },
  { key: "speechiness", label: "Speechiness" },
  { key: "liveness", label: "Liveness" },
];

function FeatureBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="bg-elevated rounded-xl px-4 py-3 flex items-center gap-4">
      <span className="text-xs text-text-secondary w-32 shrink-0">{label}</span>
      <div className="relative flex-1 h-1.5 rounded-full bg-border">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent-pink transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-text-tertiary w-8 text-right tabular-nums">{pct}%</span>
    </div>
  );
}

export default function TrackView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { play, currentTrack, isPlaying, pause } = usePlayer();
  const [track, setTrack] = useState<SpotifyTrackRaw | null>(null);
  const [features, setFeatures] = useState<AudioFeatures | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.track(id)
      .then((t) => {
        setTrack(t);
        return api.audioFeatures([t.id]);
      })
      .then((af) => setFeatures(af.features[0]?.features ?? null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="px-6 py-6 space-y-6 animate-fade-in">
        <div className="flex gap-6">
          <div className="skeleton w-48 h-48 rounded-xl shrink-0" />
          <div className="space-y-3 flex-1 pt-4">
            <div className="skeleton h-8 w-2/3 rounded" />
            <div className="skeleton h-5 w-1/3 rounded" />
            <div className="skeleton h-4 w-1/4 rounded" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!track) {
    return <div className="px-6 py-6 text-text-secondary">Track not found.</div>;
  }

  const trackItem = {
    id: track.id,
    name: track.name,
    artists: track.artists,
    albumName: track.album.name,
    albumArt: track.album.images?.[0]?.url ?? "",
    durationMs: track.duration_ms,
    previewUrl: track.preview_url ?? null,
    popularity: track.popularity,
  };

  const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
  const mood = features ? getDominantMood(features) : null;

  return (
    <div className="px-6 py-6 space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row gap-6">
        <img
          src={track.album.images?.[0]?.url ?? ""}
          alt={track.album.name}
          className="w-48 h-48 rounded-xl object-cover shrink-0 shadow-purple-glow-lg"
        />
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs font-bold tracking-widest text-text-tertiary uppercase">Song</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">{track.name}</h1>
          <div className="flex flex-wrap items-center gap-1 text-text-secondary text-sm">
            {track.artists.map((a, i) => (
              <span key={a.id}>
                <button
                  onClick={() => navigate(`/artist/${a.id}`)}
                  className="hover:text-primary hover:underline transition-colors"
                >
                  {a.name}
                </button>
                {i < track.artists.length - 1 && <span className="text-text-tertiary">, </span>}
              </span>
            ))}
            <span className="text-text-tertiary mx-1">·</span>
            <button onClick={() => navigate(`/album/${track.album.id}`)} className="hover:text-primary hover:underline transition-colors">
              {track.album.name}
            </button>
            <span className="text-text-tertiary mx-1">·</span>
            <span className="text-text-tertiary">{track.album.release_date?.slice(0, 4)}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            {/* Play/Pause button */}
            <button
              onClick={() => isCurrentlyPlaying ? pause() : play(trackItem)}
              className="play-btn w-12 h-12"
              aria-label={isCurrentlyPlaying ? "Pause" : "Play"}
            >
              {isCurrentlyPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>

            {/* Preview badge */}
            {track.preview_url && (
              <span className="text-xs text-text-tertiary bg-elevated px-3 py-1 rounded-full border border-border">
                30s preview
              </span>
            )}

            {/* Mood badge */}
            {mood && (
              <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-elevated border border-border ${mood.color}`}>
                {mood.label}
              </span>
            )}

            <span className="text-xs text-text-tertiary">{fmtDuration(track.duration_ms)}</span>
          </div>
        </div>
      </div>

      {/* Audio Features */}
      {features && (
        <section>
          <h2 className="text-xl font-bold tracking-tight text-text-primary mb-4">Audio Features</h2>
          <div className="space-y-2">
            {FEATURE_BARS.map(({ key, label }) => (
              <FeatureBar key={key} label={label} value={features[key] as number} />
            ))}
          </div>
          <div className="mt-3 flex gap-4 flex-wrap">
            <div className="bg-elevated rounded-xl px-4 py-3 flex flex-col items-center">
              <span className="text-lg font-bold text-text-primary">{Math.round(features.tempo)}</span>
              <span className="text-xs text-text-tertiary">BPM</span>
            </div>
            <div className="bg-elevated rounded-xl px-4 py-3 flex flex-col items-center">
              <span className="text-lg font-bold text-text-primary">{features.loudness.toFixed(1)}</span>
              <span className="text-xs text-text-tertiary">dB</span>
            </div>
            <div className="bg-elevated rounded-xl px-4 py-3 flex flex-col items-center">
              <span className="text-lg font-bold text-text-primary">{["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"][features.key] ?? "?"}</span>
              <span className="text-xs text-text-tertiary">Key {features.mode === 1 ? "Major" : "Minor"}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
